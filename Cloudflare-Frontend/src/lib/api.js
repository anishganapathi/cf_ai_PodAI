import { WORKER_URL } from './constants';

/**
 * API client for Cloudflare Worker
 */
class PodcastAPI {
    constructor(baseUrl = WORKER_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Generate podcast from URL
     */
    async generatePodcast(url, userId) {
        try {
            const response = await fetch(`${this.baseUrl}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url, userId }),
            });

            const json = await response.json();

            if (!response.ok) {
                throw new Error(json.error || json.message || `Server error: ${response.status}`);
            }

            // Handle synchronous API format: {success: true, result: {...}}
            if (!json.result) {
                throw new Error('Invalid response from server');
            }

            return {
                success: true,
                result: json.result
            };
        } catch (error) {
            console.error('Generate podcast error:', error);
            throw new Error(error.message || 'Failed to start podcast generation');
        }
    }

    /**
     * Check status of podcast generation
     */
    async checkStatus(workflowId) {
        try {
            const response = await fetch(`${this.baseUrl}/status/${workflowId}`);
            const json = await response.json();

            if (!response.ok) {
                // Handle error response from new v2.0 API
                throw new Error(json.error || json.message || `Server error: ${response.status}`);
            }

            // Handle new v2.0 API format: {success: true, data: {...}}
            const responseData = json.data || json;

            if (!responseData.status) {
                throw new Error('Invalid status response');
            }

            // Convert relative audio URL to absolute URL if needed (fallback for old data)
            if (responseData.result?.audioFileName && !responseData.result.audioUrl?.startsWith('http')) {
                responseData.result.audioUrl = `${this.baseUrl}/audio/${responseData.result.audioFileName}`;
            }

            return responseData;
        } catch (error) {
            console.error('Check status error:', error);
            throw new Error(error.message || 'Failed to check generation status');
        }
    }

    /**
     * Check cache for URL
     */
    async checkCache(url) {
        try {
            const response = await fetch(`${this.baseUrl}/check-cache`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            });

            if (!response.ok) {
                return { cached: false };
            }

            const json = await response.json();

            // Handle new v2.0 API format: {success: true, data: {...}}
            const data = json.data || json;

            // Convert relative audio URL to absolute URL if needed (fallback for old data)
            if (data.result?.audioFileName && !data.result.audioUrl?.startsWith('http')) {
                data.result.audioUrl = `${this.baseUrl}/audio/${data.result.audioFileName}`;
            }

            return data;
        } catch (error) {
            console.error('Cache check error:', error);
            return { cached: false };
        }
    }

    /**
     * Get user's podcast history
     */
    async getUserHistory(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/history/${userId}`);
            const json = await response.json();

            if (!response.ok) {
                throw new Error(json.error || json.message || `Server error: ${response.status}`);
            }

            // Handle new v2.0 API format: {success: true, data: [...]}
            const responseData = json.data || json;

            // Convert relative audio URLs to absolute URLs if needed (fallback for old data)
            if (Array.isArray(responseData)) {
                responseData.forEach(podcast => {
                    if (podcast.audioFileName && !podcast.audioUrl?.startsWith('http')) {
                        podcast.audioUrl = `${this.baseUrl}/audio/${podcast.audioFileName}`;
                    }
                });
            }

            return {
                success: true,
                data: responseData
            };
        } catch (error) {
            console.error('Get user history error:', error);
            throw new Error(error.message || 'Failed to get user history');
        }
    }

    /**
     * Get podcast statistics
     */
    async getStats() {
        try {
            const response = await fetch(`${this.baseUrl}/stats`);
            const json = await response.json();

            if (!response.ok) {
                throw new Error(json.error || json.message || `Server error: ${response.status}`);
            }

            // Handle new v2.0 API format: {success: true, data: {...}}
            const responseData = json.data || json;

            return {
                success: true,
                data: responseData
            };
        } catch (error) {
            console.error('Get stats error:', error);
            throw new Error(error.message || 'Failed to get statistics');
        }
    }
}

export const podcastAPI = new PodcastAPI();