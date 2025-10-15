import { PodcastWorkflow } from './workflow.js';
import { 
    initializeDatabase, 
    savePodcast, 
    getPodcastByUrl, 
    getPodcastByCacheKey,
    getUserHistory,
    recordUserAccess,
    logProcessingError,
    generateCacheKey
} from './database.js';

/**
 * Main Cloudflare Worker Entry Point
 * Handles all API routes for the News-to-Podcast service
 */
export default {
	async fetch(request, env, ctx) {
		return await handleRequest(request, env, ctx);
	},
};

// Export workflow class
export { PodcastWorkflow };

/**
 * Main request handler with routing
 */
async function handleRequest(request, env, ctx) {
	// CORS headers for all responses
	const corsHeaders = {
		'Access-Control-Allow-Origin': env.ALLOWED_ORIGINS || '*',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Max-Age': '86400',
	};

	// Handle CORS preflight
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: corsHeaders,
		});
	}

	try {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		console.log(`Request: ${method} ${path}`);

		// Route 1: POST /generate - Generate podcast synchronously
		if (path === '/generate' && method === 'POST') {
			const body = await request.json();
			const { url: articleUrl, userId } = body;

			// Validate URL format
			if (!articleUrl) {
				return jsonResponse(
					{ success: false, error: 'URL is required' },
					400,
					corsHeaders
				);
			}

			try {
				new URL(articleUrl);
			} catch (e) {
				return jsonResponse(
					{ success: false, error: 'Invalid URL format' },
					400,
					corsHeaders
				);
			}

			try {
				console.log(`Starting synchronous podcast generation for: ${articleUrl}`);
				
				// Run the podcast generation process directly
				const origin = new URL(request.url).origin;
				const result = await generatePodcastSync(articleUrl, userId || 'anonymous', env, origin);
				
				if (!result.success) {
					return jsonResponse(
						{ success: false, error: result.error },
						500,
						corsHeaders
					);
				}

				console.log('Podcast generation completed successfully');

				return jsonResponse(
					{
						success: true,
						result: result.data
					},
					200,
					corsHeaders
				);
			} catch (error) {
				console.error('Podcast generation error:', error);
				return jsonResponse(
					{ success: false, error: error.message || 'Failed to generate podcast' },
					500,
					corsHeaders
				);
			}
		}

		// Route 2: GET /status/:workflowId - Check workflow status
		if (path.startsWith('/status/') && method === 'GET') {
			const workflowId = path.split('/')[2];

			if (!workflowId) {
				return jsonResponse(
					{ success: false, error: 'Workflow ID required' },
					400,
					corsHeaders
				);
			}

			if (!env.PODCAST_WORKFLOW) {
				return jsonResponse(
					{ success: false, error: 'Workflow not configured' },
					500,
					corsHeaders
				);
			}

			try {
				const instance = await env.PODCAST_WORKFLOW.get(workflowId);

				if (!instance) {
					return jsonResponse(
						{ success: false, error: 'Workflow not found' },
						404,
						corsHeaders
					);
				}

				const status = await instance.status();
				console.log(`Workflow ${workflowId} status:`, status.status);

				// If complete, return result
				if (status.status === 'complete' && status.output) {
					const result = status.output;
					
					// Generate audio URL if needed
					if (result.audioFileName && !result.audioUrl) {
						const origin = new URL(request.url).origin;
						result.audioUrl = `${origin}/audio/${result.audioFileName}`;
					}

					return jsonResponse(
						{
							success: true,
							data: {
								status: 'complete',
								result: result
							}
						},
						200,
						corsHeaders
					);
				}

				// If error, return error
				if (status.status === 'error') {
					return jsonResponse(
						{
							success: false,
							error: status.output?.error || 'Workflow failed',
							status: 'error'
						},
						500,
						corsHeaders
					);
				}

				// Return current status
				return jsonResponse(
					{
						success: true,
						data: {
							status: status.status || 'running',
							message: getStatusMessage(status.status)
						}
					},
					200,
					corsHeaders
				);

			} catch (error) {
				console.error('Status check error:', error);
				return jsonResponse(
					{ success: false, error: 'Failed to check status' },
					500,
					corsHeaders
				);
			}
		}

		// Route 3: POST /check-cache - Check if URL is cached
		if (path === '/check-cache' && method === 'POST') {
			const body = await request.json();
			const { url: articleUrl } = body;

			if (!articleUrl) {
				return jsonResponse(
					{ success: false, error: 'URL is required' },
					400,
					corsHeaders
				);
			}

			if (!env.PODCAST_DB) {
				return jsonResponse(
					{ success: true, data: { cached: false } },
					200,
					corsHeaders
				);
			}

			try {
				const result = await getPodcastByUrl(env.PODCAST_DB, articleUrl);

				if (result.success && result.data) {
					const cached = result.data;
					
					// Generate audio URL if needed
					if (cached.audioFileName && !cached.audioUrl) {
						const origin = new URL(request.url).origin;
						cached.audioUrl = `${origin}/audio/${cached.audioFileName}`;
					}

					return jsonResponse(
						{
							success: true,
							data: {
								cached: true,
								result: cached
							}
						},
						200,
						corsHeaders
					);
				}

				return jsonResponse(
					{ success: true, data: { cached: false } },
					200,
					corsHeaders
				);

			} catch (error) {
				console.error('Cache check error:', error);
				return jsonResponse(
					{ success: true, data: { cached: false } },
					200,
					corsHeaders
				);
			}
		}

		// Route 4: GET /audio/:filename - Serve audio file from R2
		if (path.startsWith('/audio/') && method === 'GET') {
			const fileName = path.split('/')[2];

			if (!fileName) {
				return new Response('Filename required', { 
					status: 400,
					headers: corsHeaders 
				});
			}

			if (!env.AUDIO_BUCKET) {
				return new Response('Storage not configured', { 
					status: 500,
					headers: corsHeaders 
				});
			}

			try {
				const object = await env.AUDIO_BUCKET.get(fileName);

				if (!object) {
					return new Response('Audio not found', { 
						status: 404,
						headers: corsHeaders 
					});
				}

				const headers = new Headers(corsHeaders);
				headers.set('Content-Type', 'audio/mpeg');
				headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year
				headers.set('Content-Disposition', `inline; filename="${fileName}"`);
				headers.set('Accept-Ranges', 'bytes'); // Enable range requests for audio seeking
				headers.set('Access-Control-Allow-Headers', 'Range, Content-Range'); // Allow range requests

				return new Response(object.body, { headers });

			} catch (error) {
				console.error('R2 fetch error:', error);
				return new Response('Failed to fetch audio', { 
					status: 500,
					headers: corsHeaders 
				});
			}
		}

		// Route 5: GET /history/:userId - Get user's podcast history
		if (path.startsWith('/history/') && method === 'GET') {
			const userId = path.split('/')[2];

			if (!userId) {
				return jsonResponse(
					{ success: false, error: 'User ID required' },
					400,
					corsHeaders
				);
			}

			if (!env.PODCAST_DB) {
				return jsonResponse(
					{ success: false, error: 'Database not configured' },
					500,
					corsHeaders
				);
			}

			try {
				const result = await getUserHistory(env.PODCAST_DB, userId);
				
				if (result.success) {
					// Generate audio URLs for all podcasts
					const origin = new URL(request.url).origin;
					result.data.forEach(podcast => {
						if (podcast.audioFileName && !podcast.audioUrl) {
							podcast.audioUrl = `${origin}/audio/${podcast.audioFileName}`;
						}
					});

					return jsonResponse(
						{
							success: true,
							data: result.data
						},
						200,
						corsHeaders
					);
				}

				return jsonResponse(
					{ success: false, error: result.error },
					500,
					corsHeaders
				);

			} catch (error) {
				console.error('Get history error:', error);
				return jsonResponse(
					{ success: false, error: 'Failed to get history' },
					500,
					corsHeaders
				);
			}
		}

		// Route 6: GET /stats - Get podcast statistics
		if (path === '/stats' && method === 'GET') {
			if (!env.PODCAST_DB) {
				return jsonResponse(
					{ success: false, error: 'Database not configured' },
					500,
					corsHeaders
				);
			}

			try {
				const { getPodcastStats } = await import('./database.js');
				const result = await getPodcastStats(env.PODCAST_DB);
				
				if (result.success) {
					return jsonResponse(
						{
							success: true,
							data: result.data
						},
						200,
						corsHeaders
					);
				}

				return jsonResponse(
					{ success: false, error: result.error },
					500,
					corsHeaders
				);

			} catch (error) {
				console.error('Get stats error:', error);
				return jsonResponse(
					{ success: false, error: 'Failed to get statistics' },
					500,
					corsHeaders
				);
			}
		}

		// Route 7: GET / - Health check
		if (path === '/' && method === 'GET') {
			return jsonResponse(
				{
					success: true,
					data: {
						status: 'ok',
						service: 'Podcast Worker',
						version: '2.0.0',
						database: env.PODCAST_DB ? 'D1' : 'Not configured',
						timestamp: new Date().toISOString()
					}
				},
				200,
				corsHeaders
			);
		}

		// 404 - Not found
		return jsonResponse(
			{ success: false, error: 'Not found' },
			404,
			corsHeaders
		);

	} catch (error) {
		console.error('Worker error:', error);
		return jsonResponse(
			{ success: false, error: 'Internal server error' },
			500,
			corsHeaders
		);
	}
}

/**
 * Helper: Format JSON response
 */
function jsonResponse(data, status = 200, additionalHeaders = {}) {
	return new Response(JSON.stringify(data, null, 2), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...additionalHeaders,
		},
	});
}


/**
 * Helper: Get human readable status message
 */
function getStatusMessage(status) {
	const messages = {
		queued: 'Podcast generation queued',
		running: 'Processing your podcast...',
		complete: 'Podcast ready!',
		error: 'Failed to generate podcast',
	};
	return messages[status] || 'Processing...';
}

/**
 * Generate podcast synchronously (without workflow)
 */
async function generatePodcastSync(url, userId, env, origin) {
	const startTime = Date.now();
	
	try {
		console.log(`Starting synchronous podcast generation for URL: ${url}`);

		// Initialize database if needed
		if (env.PODCAST_DB) {
			await initializeDatabase(env.PODCAST_DB);
		}

		// Step 1: Check database for existing podcast
		if (env.PODCAST_DB) {
			try {
				const result = await getPodcastByUrl(env.PODCAST_DB, url);

				if (result.success && result.data) {
					console.log('Database hit! Returning cached podcast');
					const cachedData = result.data;
					
					// Ensure full audio URL is included
					if (cachedData.audioFileName && !cachedData.audioUrl?.startsWith('http')) {
						cachedData.audioUrl = `${origin}/audio/${cachedData.audioFileName}`;
					}
					
					return {
						success: true,
						data: {
							...cachedData,
							cached: true
						}
					};
				}
			} catch (error) {
				console.error('Database check error:', error);
			}
		}

		// Import required modules
		const { scrapeWebpage, extractTitle } = await import('./scraper.js');
		const { summarizeArticle } = await import('./ai-helper.js');

		// Step 2: Scrape webpage and extract title in parallel
		console.log('[Step 2] Scraping webpage and extracting title...');
		let content, title;
		try {
			[content, title] = await Promise.all([
				scrapeWebpage(url),
				extractTitle(url)
			]);
		} catch (error) {
			console.error('Web scraping error:', error);
			throw new Error(`Failed to scrape webpage: ${error.message}`);
		}

		if (!content || content.length < 100) {
			throw new Error('Insufficient content extracted from webpage. The page may be empty or require authentication.');
		}

		console.log(`Scraped ${content.length} characters, title: ${title}`);

		// Step 3: AI summarization
		console.log('[Step 3] AI summarization...');
		if (!env.AI) {
			throw new Error('AI service not available. Please check configuration.');
		}

		// Truncate content for faster processing
		let truncatedContent = content;
		if (content.length > 1000) {
			truncatedContent = content.substring(0, 1000);
			const lastPeriod = truncatedContent.lastIndexOf('.');
			if (lastPeriod > 800) {
				truncatedContent = truncatedContent.substring(0, lastPeriod + 1);
			}
		}

		let summary;
		try {
			summary = await summarizeArticle(env.AI, truncatedContent);
		} catch (error) {
			console.error('AI summarization error:', error);
			throw new Error(`AI summarization failed: ${error.message}`);
		}

		if (!summary || summary.length < 30) {
			throw new Error('AI generated insufficient content. The article may be too short or complex to summarize.');
		}

		console.log(`AI generated ${summary.length} character script`);

		// Step 4: Generate audio with ElevenLabs
		console.log('[Step 4] Generating audio with ElevenLabs...');
		let audioBuffer;
		try {
			audioBuffer = await generateAudio(summary, env);
			if (!audioBuffer || audioBuffer.byteLength === 0) {
				throw new Error('Generated audio is empty');
			}
			console.log(`Audio generated: ${audioBuffer.byteLength} bytes`);
		} catch (error) {
			console.error('ElevenLabs audio generation error:', error);
			throw new Error(`Audio generation failed: ${error.message}`);
		}

		// Step 5: Store audio in R2
		console.log('[Step 5] Storing audio in R2...');
		if (!env.AUDIO_BUCKET) {
			throw new Error('Audio storage not configured. Please check R2 bucket settings.');
		}

		const fileName = `podcast_${generateCacheKey(url)}.mp3`;
		try {
			await env.AUDIO_BUCKET.put(fileName, audioBuffer, {
				httpMetadata: {
					contentType: 'audio/mpeg',
				},
				customMetadata: {
					url: url,
					title: title,
					createdAt: new Date().toISOString(),
					userId: userId
				},
			});
			console.log(`Audio stored as ${fileName}`);
		} catch (error) {
			console.error('R2 storage error:', error);
			throw new Error(`Failed to store audio: ${error.message}`);
		}

		// Step 6: Save to database
		const processingTime = Date.now() - startTime;
		const cacheKey = generateCacheKey(url);
		
		// Generate full audio URL for storage
		const fullAudioUrl = `${origin}/audio/${fileName}`;
		
		const podcastData = {
			url,
			title,
			summary,
			audioFileName: fileName,
			audioUrl: fullAudioUrl, // Store full URL for easy playback
			userId,
			status: 'completed',
			processingTimeMs: processingTime,
			contentLength: content.length,
			summaryLength: summary.length,
			audioSizeBytes: audioBuffer.byteLength,
			cacheKey
		};

		if (env.PODCAST_DB) {
			try {
				const saveResult = await savePodcast(env.PODCAST_DB, podcastData);
				if (saveResult.success) {
					console.log(`Saved to database with ID: ${saveResult.id}`);
				} else {
					console.error('Database save failed:', saveResult.error);
					// Don't fail the whole process if database save fails
				}
			} catch (error) {
				console.error('Database save error:', error);
				// Don't fail the whole process if database save fails
			}
		}

				console.log('✅ Synchronous podcast generation completed successfully!');

		return {
			success: true,
			data: {
				...podcastData,
				audioUrl: fullAudioUrl, // Ensure full URL is returned
				createdAt: new Date().toISOString()
			}
		};

	} catch (error) {
		console.error('Synchronous generation error:', error);
		return {
			success: false,
			error: error.message || 'Unknown error occurred'
		};
	}
}

/**
 * Generate audio using ElevenLabs API
 */
async function generateAudio(text, env) {
	const apiKey = env.ELEVENLABS_API_KEY;
	const voiceId = env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

	if (!apiKey) {
		throw new Error('ElevenLabs API key not configured');
	}

	if (!text || text.trim().length === 0) {
		throw new Error('Cannot generate audio from empty text');
	}

	// Ultra-aggressive text limit for maximum ElevenLabs speed
	let processedText = text;
	if (text.length > 800) {
		processedText = text.substring(0, 800);
		// Try to end at a sentence
		const lastPeriod = processedText.lastIndexOf('.');
		if (lastPeriod > 600) {
			processedText = processedText.substring(0, lastPeriod + 1);
		}
	}

	const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

	const requestBody = {
		text: processedText,
		model_id: 'eleven_turbo_v2', // Fastest model
		voice_settings: {
			stability: 0.7,
			similarity_boost: 0.8,
			style: 0.0,
			use_speaker_boost: false // Disable for speed
		}
	};

	try {
		console.log('Calling ElevenLabs API...');
		
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Accept': 'audio/mpeg',
				'Content-Type': 'application/json',
				'xi-api-key': apiKey
			},
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
		}

		const audioBuffer = await response.arrayBuffer();

		if (!audioBuffer || audioBuffer.byteLength === 0) {
			throw new Error('ElevenLabs returned empty audio');
		}

		return audioBuffer;

	} catch (error) {
		console.error('ElevenLabs API error:', error);
		throw new Error(`ElevenLabs TTS failed: ${error.message}`);
	}
}

/**
 * Create fallback audio when ElevenLabs fails
 */
function createFallbackAudio(text) {
	// Create a simple MP3 header for a silent audio file
	// This is a minimal MP3 file that will play as silence
	const mp3Header = new Uint8Array([
		0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
	]);
	
	// Add some text-based audio data (simplified)
	const textBytes = new TextEncoder().encode(text.substring(0, 100));
	const audioData = new Uint8Array(mp3Header.length + textBytes.length);
	audioData.set(mp3Header);
	audioData.set(textBytes, mp3Header.length);
	
	return audioData.buffer;
}