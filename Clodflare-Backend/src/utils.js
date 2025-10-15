/**
 * PRODUCTION-GRADE UTILITIES & ERROR CLASSES
 * Custom error classes, helpers, and utility functions
 */

// ========================================
// CUSTOM ERROR CLASSES
// ========================================

export class ValidationError extends Error {
	constructor(message, details = {}) {
		super(message);
		this.name = 'ValidationError';
		this.code = 'VALIDATION_ERROR';
		this.statusCode = 400;
		this.details = details;
	}
}

export class WorkflowError extends Error {
	constructor(message, step = null, details = {}) {
		super(message);
		this.name = 'WorkflowError';
		this.code = 'WORKFLOW_ERROR';
		this.statusCode = 500;
		this.step = step;
		this.details = details;
	}
}

export class StorageError extends Error {
	constructor(message, operation = null, details = {}) {
		super(message);
		this.name = 'StorageError';
		this.code = 'STORAGE_ERROR';
		this.statusCode = 500;
		this.operation = operation;
		this.details = details;
	}
}

export class ExternalAPIError extends Error {
	constructor(message, service = null, statusCode = 500, details = {}) {
		super(message);
		this.name = 'ExternalAPIError';
		this.code = 'EXTERNAL_API_ERROR';
		this.statusCode = statusCode;
		this.service = service;
		this.details = details;
	}
}

export class ScrapingError extends Error {
	constructor(message, url = null, details = {}) {
		super(message);
		this.name = 'ScrapingError';
		this.code = 'SCRAPING_ERROR';
		this.statusCode = 500;
		this.url = url;
		this.details = details;
	}
}

export class AIError extends Error {
	constructor(message, model = null, details = {}) {
		super(message);
		this.name = 'AIError';
		this.code = 'AI_ERROR';
		this.statusCode = 500;
		this.model = model;
		this.details = details;
	}
}

export class TTSError extends Error {
	constructor(message, service = null, details = {}) {
		super(message);
		this.name = 'TTSError';
		this.code = 'TTS_ERROR';
		this.statusCode = 500;
		this.service = service;
		this.details = details;
	}
}

export class RateLimitError extends Error {
	constructor(message, userId = null, limit = null) {
		super(message);
		this.name = 'RateLimitError';
		this.code = 'RATE_LIMIT_EXCEEDED';
		this.statusCode = 429;
		this.userId = userId;
		this.limit = limit;
	}
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Generate unique request ID for tracking
 */
export function generateRequestId() {
	return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate cache key from URL
 */
export function generateCacheKey(url) {
	// Use crypto.subtle for better hashing if available
	let hash = 0;
	for (let i = 0; i < url.length; i++) {
		const char = url.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return `podcast_${Math.abs(hash).toString(36)}`;
}

/**
 * Validate URL format and accessibility
 */
export async function validateUrl(url) {
	// Check URL format
	let urlObj;
	try {
		urlObj = new URL(url);
	} catch (e) {
		throw new ValidationError('Invalid URL format', { url });
	}

	// Must be HTTP or HTTPS
	if (!['http:', 'https:'].includes(urlObj.protocol)) {
		throw new ValidationError('URL must use HTTP or HTTPS protocol', { 
			url, 
			protocol: urlObj.protocol 
		});
	}

	// Check URL accessibility with HEAD request
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

		const response = await fetch(url, {
			method: 'HEAD',
			signal: controller.signal,
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; PodcastBot/1.0)'
			}
		});

		clearTimeout(timeoutId);

		if (!response.ok && response.status !== 405) { // 405 = Method Not Allowed (some sites block HEAD)
			throw new ValidationError('URL is not accessible', { 
				url, 
				status: response.status,
				statusText: response.statusText 
			});
		}
	} catch (error) {
		if (error.name === 'AbortError') {
			throw new ValidationError('URL took too long to respond (timeout)', { url });
		}
		// If HEAD fails, we'll still try - some sites block HEAD requests
		console.warn(`HEAD request failed for ${url}, will try GET during scraping`);
	}

	return urlObj;
}

/**
 * Validate userId format
 */
export function validateUserId(userId) {
	if (!userId) {
		return 'anonymous';
	}

	if (typeof userId !== 'string') {
		throw new ValidationError('userId must be a string', { userId });
	}

	// Sanitize userId (remove special characters)
	const sanitized = userId.replace(/[^a-zA-Z0-9_-]/g, '');
	
	if (sanitized.length === 0) {
		return 'anonymous';
	}

	if (sanitized.length > 100) {
		throw new ValidationError('userId is too long (max 100 characters)', { userId });
	}

	return sanitized;
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input) {
	if (typeof input !== 'string') {
		return input;
	}

	return input
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.replace(/\//g, '&#x2F;');
}

/**
 * Format error response
 */
export function formatErrorResponse(error, isDevelopment = false) {
	const response = {
		success: false,
		error: error.message || 'An unknown error occurred',
		code: error.code || 'UNKNOWN_ERROR',
		timestamp: new Date().toISOString()
	};

	// Add additional details for specific error types
	if (error.step) response.step = error.step;
	if (error.service) response.service = error.service;
	if (error.url) response.url = error.url;
	
	// Include stack trace only in development
	if (isDevelopment && error.stack) {
		response.stack = error.stack;
	}

	return response;
}

/**
 * Format success response
 */
export function formatSuccessResponse(data, processingTime = null) {
	const response = {
		success: true,
		data,
		timestamp: new Date().toISOString()
	};

	if (processingTime !== null) {
		response.processing_time_ms = processingTime;
	}

	return response;
}

/**
 * Check rate limit for user
 */
export async function checkRateLimit(env, userId, limit = 100) {
	if (!env.PODCAST_CACHE) {
		return true; // No cache available, skip rate limiting
	}

	const key = `ratelimit_${userId}_${getDateKey()}`;
	
	try {
		const current = await env.PODCAST_CACHE.get(key);
		const count = current ? parseInt(current) : 0;

		if (count >= limit) {
			throw new RateLimitError(
				`Rate limit exceeded: ${limit} requests per day`,
				userId,
				limit
			);
		}

		// Increment counter
		await env.PODCAST_CACHE.put(key, String(count + 1), {
			expirationTtl: 86400 // 24 hours
		});

		return true;
	} catch (error) {
		if (error instanceof RateLimitError) {
			throw error;
		}
		// If rate limiting fails, allow the request
		console.warn('Rate limit check failed:', error);
		return true;
	}
}

/**
 * Get date key for rate limiting (YYYY-MM-DD)
 */
function getDateKey() {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Sleep utility for retry delays
 */
export function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 500) {
	let lastError;
	
	for (let i = 0; i < maxRetries; i++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			
			if (i < maxRetries - 1) {
				const delay = baseDelay * Math.pow(2, i);
				console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms delay`);
				await sleep(delay);
			}
		}
	}
	
	throw lastError;
}

/**
 * Execute with timeout
 */
export async function withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
	let timeoutId;
	
	const timeoutPromise = new Promise((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(new Error(errorMessage));
		}, timeoutMs);
	});

	try {
		const result = await Promise.race([promise, timeoutPromise]);
		clearTimeout(timeoutId);
		return result;
	} catch (error) {
		clearTimeout(timeoutId);
		throw error;
	}
}

/**
 * Get CORS headers
 */
export function getCorsHeaders(allowedOrigins = '*') {
	return {
		'Access-Control-Allow-Origin': allowedOrigins,
		'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
		'Access-Control-Max-Age': '86400'
	};
}

/**
 * Create JSON response
 */
export function jsonResponse(data, status = 200, additionalHeaders = {}) {
	return new Response(JSON.stringify(data, null, 2), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...additionalHeaders
		}
	});
}

/**
 * Decode HTML entities
 */
export function decodeHtmlEntities(text) {
	return text
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&mdash;/g, '—')
		.replace(/&ndash;/g, '–')
		.replace(/&hellip;/g, '...')
		.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
		.replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Get status message for workflow status
 */
export function getStatusMessage(status) {
	const messages = {
		queued: 'Podcast generation queued',
		running: 'Processing your podcast...',
		complete: 'Podcast ready!',
		error: 'Failed to generate podcast',
		cancelled: 'Podcast generation cancelled'
	};
	return messages[status] || 'Processing...';
}

/**
 * Log with structured format
 */
export function logStructured(level, message, data = {}) {
	const log = {
		level,
		message,
		timestamp: new Date().toISOString(),
		...data
	};
	console.log(JSON.stringify(log));
}

