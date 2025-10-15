/**
 * AI helper functions for content summarization using Cloudflare Workers AI (Llama 3.3)
 */

/**
 * Summarize article content into podcast script using Llama 3.3
 * @param {Object} ai - Cloudflare Workers AI binding
 * @param {string} content - Article content to summarize
 * @returns {Promise<string>} - Podcast script (200-300 words)
 */
export async function summarizeArticle(ai, content) {
	try {
		console.log('Starting AI summarization with Llama 3.3...');

		// Validate inputs
		if (!ai) {
			throw new Error('AI binding not available');
		}

		if (!content || typeof content !== 'string') {
			throw new Error('Invalid content provided for summarization');
		}

		if (content.length < 100) {
			throw new Error('Content too short for summarization (minimum 100 characters)');
		}

		// Ultra-aggressive content truncation for maximum speed
		let processedContent = content;
		if (content.length > 1000) {
			processedContent = content.substring(0, 1000);
			// Try to end at a sentence boundary
			const lastPeriod = processedContent.lastIndexOf('.');
			if (lastPeriod > 800) {
				processedContent = processedContent.substring(0, lastPeriod + 1);
			}
			console.log(`Ultra-truncated content from ${content.length} to ${processedContent.length} characters`);
		}

		// Create ultra-fast system prompt
		const systemPrompt = `Create a short podcast script (100-150 words) in conversational tone. Start with a hook, be informative, end with a takeaway. NO meta-commentary.`;

		// Create optimized user prompt
		const userPrompt = `Article: ${processedContent}

Podcast script:`;

		// Call fastest Llama model with minimal tokens
		console.log('Calling Llama 3.1 8B model with ultra-fast settings...');
		
		const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			],
			max_tokens: 200, // Ultra-minimal tokens for speed
			temperature: 0.9, // Higher for faster generation
			top_p: 0.95
		});

		console.log('AI response received');

		// Extract response text from different possible formats
		let summary = '';
		if (response && response.response) {
			summary = response.response;
		} else if (response && response.result && response.result.response) {
			summary = response.result.response;
		} else if (typeof response === 'string') {
			summary = response;
		} else {
			console.error('Unexpected AI response format:', response);
			throw new Error('Invalid response format from AI model');
		}

		// Clean up the response
		summary = summary.trim();

		// Remove any meta-commentary that might have been included
		summary = summary
			.replace(/^(Here's|Here is|This is|I've created).*?:/i, '')
			.replace(/^(Sure|Okay|Alright)[,!.]?\s*/i, '')
			.trim();

		// Validate output length
		if (!summary || summary.length < 50) {
			throw new Error(`AI generated insufficient content: ${summary?.length || 0} characters`);
		}

		// Log success
		const wordCount = summary.split(' ').length;
		console.log(`AI successfully generated ${summary.length} character script (${wordCount} words)`);

		return summary;

	} catch (error) {
		console.error('AI summarization error:', error);
		
		// Re-throw with more context
		if (error.message.includes('AI binding not available')) {
			throw error;
		} else if (error.message.includes('Invalid content')) {
			throw error;
		} else if (error.message.includes('too short')) {
			throw error;
		} else if (error.message.includes('insufficient content')) {
			throw error;
		} else {
			throw new Error(`AI summarization failed: ${error.message}`);
		}
	}
}