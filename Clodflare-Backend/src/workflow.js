import { WorkflowEntrypoint } from 'cloudflare:workers';
import { scrapeWebpage, extractTitle } from './scraper.js';
import { summarizeArticle } from './ai-helper.js';
import { 
    initializeDatabase, 
    savePodcast, 
    getPodcastByUrl, 
    generateCacheKey 
} from './database.js';

/**
 * Podcast Generation Workflow
 * 7-step orchestrated process to convert news articles to podcasts
 */
export class PodcastWorkflow extends WorkflowEntrypoint {
	async run(event, step) {
		const { url, userId } = event.params;
		// Access env from event.env, not this.env
		const env = event.env;

		try {
			console.log(`Starting workflow for URL: ${url}`);

			// Initialize database if needed
			if (env.PODCAST_DB) {
				await initializeDatabase(env.PODCAST_DB);
			}

			// Step 1: Check database for existing podcast
			const cached = await step.do('check-database', async () => {
				console.log('[Step 1] Checking database...');
				
				if (!env.PODCAST_DB) {
					console.warn('Database not available');
					return null;
				}

				try {
					const result = await getPodcastByUrl(env.PODCAST_DB, url);

					if (result.success && result.data) {
						console.log('Database hit!');
						return result.data;
					}

					console.log('Database miss');
					return null;
				} catch (error) {
					console.error('Database check error:', error);
					return null;
				}
			});

			// If cached, return immediately
			if (cached && cached.audioFileName) {
				console.log('Returning cached podcast');
				return {
					success: true,
					cached: true,
					...cached
				};
			}

			// Steps 2 & 3: Scrape webpage and extract title in parallel
			const [content, title] = await Promise.all([
				step.do('scrape-webpage', async () => {
					console.log('[Step 2] Scraping webpage...');
					
					try {
						const scrapedContent = await scrapeWebpage(url);
						
						if (!scrapedContent || scrapedContent.length < 100) {
							throw new Error('Insufficient content extracted from webpage');
						}
						
						console.log(`Scraped ${scrapedContent.length} characters`);
						return scrapedContent;
					} catch (error) {
						console.error('Scraping failed:', error);
						throw new Error(`Failed to scrape webpage: ${error.message}`);
					}
				}),
				step.do('extract-title', async () => {
					console.log('[Step 3] Extracting title...');
					
					try {
						const extractedTitle = extractTitle(url);
						console.log(`Title: ${extractedTitle}`);
						return extractedTitle;
					} catch (error) {
						console.error('Title extraction failed:', error);
						return 'Article'; // Fallback title
					}
				})
			]);

			// Step 4: Ultra-fast AI summarization with minimal content
			const summary = await step.do('summarize-content', async () => {
				console.log('[Step 4] Ultra-fast AI summarization...');
				
				if (!env.AI) {
					throw new Error('AI not available');
				}

				try {
					// Aggressively truncate content for ultra-fast processing
					let truncatedContent = content;
					if (content.length > 1000) {
						truncatedContent = content.substring(0, 1000);
						const lastPeriod = truncatedContent.lastIndexOf('.');
						if (lastPeriod > 800) {
							truncatedContent = truncatedContent.substring(0, lastPeriod + 1);
						}
					}
					
					const podcastScript = await summarizeArticle(env.AI, truncatedContent);
					
					if (!podcastScript || podcastScript.length < 30) {
						throw new Error('AI generated insufficient content');
					}
					
					console.log(`AI generated ${podcastScript.length} character script`);
					return podcastScript;
				} catch (error) {
					console.error('AI summarization failed:', error);
					throw new Error(`Failed to create podcast script: ${error.message}`);
				}
			});

			// Step 5: Generate audio with ElevenLabs
			const audioBuffer = await step.do('generate-audio', async () => {
				console.log('[Step 5] Generating audio with ElevenLabs...');
				
				try {
					const audio = await this.generateAudio(summary, env);
					
					if (!audio || audio.byteLength === 0) {
						throw new Error('Generated audio is empty');
					}
					
					console.log(`Audio generated: ${audio.byteLength} bytes`);
					return audio;
				} catch (error) {
					console.error('Audio generation failed:', error);
					throw new Error(`Failed to generate audio: ${error.message}`);
				}
			});

			// Step 6: Store audio in R2
			const audioFileName = await step.do('store-audio', async () => {
				console.log('[Step 6] Storing audio in R2...');
				
				if (!env.AUDIO_BUCKET) {
					throw new Error('R2 bucket not configured');
				}

				try {
					const fileName = `podcast_${this.generateCacheKey(url)}.mp3`;

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
					return fileName;
				} catch (error) {
					console.error('R2 storage failed:', error);
					throw new Error(`Failed to store audio: ${error.message}`);
				}
			});

			// Step 7: Save to database
			const result = await step.do('save-to-database', async () => {
				console.log('[Step 7] Saving to database...');
				
				const cacheKey = generateCacheKey(url);
				const podcastData = {
					url,
					title,
					summary,
					audioFileName,
					audioUrl: audioFileName, // Will be converted to full URL in main worker
					userId,
					status: 'completed',
					cacheKey
				};

				if (env.PODCAST_DB) {
					try {
						const saveResult = await savePodcast(env.PODCAST_DB, podcastData);
						
						if (saveResult.success) {
							console.log(`Saved to database with ID: ${saveResult.id}`);
						} else {
							console.error('Database save failed:', saveResult.error);
							// Don't fail the whole workflow if database save fails
						}
					} catch (error) {
						console.error('Database save error:', error);
						// Don't fail the whole workflow if database save fails
					}
				}

				return {
					...podcastData,
					createdAt: new Date().toISOString()
				};
			});

			console.log('✅ Workflow completed successfully!');

			return {
				success: true,
				cached: false,
				...result
			};

		} catch (error) {
			console.error('Workflow error:', error);
			return {
				success: false,
				error: error.message || 'Unknown error occurred'
			};
		}
	}

	/**
	 * Generate audio using ElevenLabs API
	 */
	async generateAudio(text, env) {
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

}