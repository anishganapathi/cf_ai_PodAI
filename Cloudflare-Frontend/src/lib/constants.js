// Cloudflare Worker URL - DEPLOYED!
export const WORKER_URL = 'https://podcast-worker.anishganapathi03.workers.dev';

// Polling configuration - Ultra-fast for minimal processing
export const POLL_INTERVAL = 1000; // 1 second (ultra-fast feedback)
export const MAX_POLL_ATTEMPTS = 20; // 20 seconds max (20 * 1s = 20s)

// Status messages - More optimistic timing
export const STATUS_MESSAGES = {
    'queued': 'Queued for processing...',
    'running': 'Generating your podcast...',
    'complete': 'Complete!',
    'error': 'Error occurred',
};

// Error messages - Updated for ultra-fast processing
export const ERROR_MESSAGES = {
    INVALID_URL: 'Please navigate to a valid webpage to generate a podcast.',
    GENERATION_FAILED: 'Failed to generate podcast. Please try again.',
    TIMEOUT: 'Generation is taking longer than expected. The podcast may still be processing. Try checking the history in a minute.',
    NETWORK_ERROR: 'Network error. Please check your connection and try again.',
    RATE_LIMIT: 'You\'ve reached your daily limit. Please try again tomorrow.',
};