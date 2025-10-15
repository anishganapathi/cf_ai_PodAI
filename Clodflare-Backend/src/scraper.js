/**
 * Web scraping functions for extracting content from news articles
 */

/**
 * Scrape webpage and extract clean text content
 * @param {string} url - The URL to scrape
 * @returns {Promise<string>} - Clean text content
 */
export async function scrapeWebpage(url) {
	try {
		console.log(`Scraping URL: ${url}`);

		// Fetch webpage with proper headers
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
			}
		});

		// Check if fetch was successful
		if (!response.ok) {
			throw new Error(`Failed to fetch webpage: ${response.status} ${response.statusText}`);
		}

		// Get HTML content
		const html = await response.text();

		if (!html || html.length < 100) {
			throw new Error('Webpage returned empty or insufficient content');
		}

		// Clean HTML content
		let textContent = html;

		// Remove <script> tags and their content
		textContent = textContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

		// Remove <style> tags and their content
		textContent = textContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

		// Remove HTML comments
		textContent = textContent.replace(/<!--[\s\S]*?-->/g, '');

		// Remove all HTML tags
		textContent = textContent.replace(/<[^>]+>/g, ' ');

		// Decode common HTML entities
		textContent = textContent
			.replace(/&nbsp;/g, ' ')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&apos;/g, "'");

		// Clean whitespace - replace multiple whitespace with single space
		textContent = textContent.replace(/\s+/g, ' ');

		// Trim whitespace from beginning and end
		textContent = textContent.trim();

		// Ultra-aggressive content limit for maximum speed
		if (textContent.length > 1000) {
			textContent = textContent.substring(0, 1000);
			// Try to end at a sentence boundary
			const lastPeriod = textContent.lastIndexOf('.');
			if (lastPeriod > 800) {
				textContent = textContent.substring(0, lastPeriod + 1);
			}
		}

		// Validate minimum content length
		if (textContent.length < 100) {
			throw new Error('Not enough meaningful content found on the page');
		}

		console.log(`Successfully extracted ${textContent.length} characters`);
		return textContent;

	} catch (error) {
		console.error('Scraping error:', error);
		throw new Error(`Failed to scrape webpage: ${error.message}`);
	}
}

/**
 * Extract title from URL
 * @param {string} url - The URL to extract title from
 * @returns {string} - Formatted title
 */
export function extractTitle(url) {
	try {
		console.log(`Extracting title from URL: ${url}`);

		// Parse URL to get pathname
		const urlObject = new URL(url);
		const pathname = urlObject.pathname;

		// Get the last segment of the path (remove leading slash and trailing slash)
		const pathSegments = pathname.split('/').filter(segment => segment.length > 0);
		
		let titleSegment;
		if (pathSegments.length === 0) {
			// If no path segments, use hostname
			titleSegment = urlObject.hostname.replace('www.', '');
		} else {
			// Use the last path segment
			titleSegment = pathSegments[pathSegments.length - 1];
		}

		// Remove file extensions if present
		titleSegment = titleSegment.replace(/\.[^.]+$/, '');

		// Replace hyphens and underscores with spaces
		let title = titleSegment
			.replace(/-/g, ' ')
			.replace(/_/g, ' ');

		// Capitalize each word
		title = title
			.split(' ')
			.map(word => {
				if (word.length === 0) return word;
				return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
			})
			.join(' ');

		// Clean up multiple spaces
		title = title.replace(/\s+/g, ' ').trim();

		// If title is empty or too short, use fallback
		if (!title || title.length < 3) {
			title = 'Article';
		}

		// Limit title length
		if (title.length > 100) {
			title = title.substring(0, 100).trim();
		}

		console.log(`Extracted title: ${title}`);
		return title;

	} catch (error) {
		console.error('Title extraction error:', error);
		return 'Article';
	}
}