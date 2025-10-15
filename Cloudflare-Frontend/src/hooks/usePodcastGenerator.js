import { useState, useCallback } from 'react';
import { podcastAPI } from '../lib/api';
import { ERROR_MESSAGES } from '../lib/constants';

export function usePodcastGenerator() {
    const [status, setStatus] = useState('idle'); 
    const [statusMessage, setStatusMessage] = useState('');
    const [podcast, setPodcast] = useState(null);
    const [error, setError] = useState(null);
    const [errorDetails, setErrorDetails] = useState(null);

    /**
     * Generate podcast
     */
    const generate = useCallback(async (url, userId, onAutoSave) => {
        try {
            // Reset state
            setStatus('generating');
            setStatusMessage('Generating your podcast...');
            setError(null);
            setErrorDetails(null);
            setPodcast(null);

            // Validate URL
            try {
                new URL(url);
            } catch {
                throw new Error(ERROR_MESSAGES.INVALID_URL);
            }

            // Call API and wait for completion
            const data = await podcastAPI.generatePodcast(url, userId);

            if (!data?.success) {
                throw new Error(data?.message || ERROR_MESSAGES.GENERATION_FAILED);
            }

            // Set the result
            setStatus('complete');
            setPodcast(data.result);
            setStatusMessage('Podcast generated successfully!');

            // Auto-save to history if callback provided
            if (onAutoSave && data.result) {
                try {
                    await onAutoSave(data.result);
                } catch (saveError) {
                    console.error('Auto-save failed:', saveError);
                    // Don't fail the whole process if auto-save fails
                }
            }

        } catch (err) {
            console.error('Generation error:', err);
            setStatus('error');
            
            // Capture detailed error information
            const errorInfo = {
                message: err.message || ERROR_MESSAGES.GENERATION_FAILED,
                type: 'generation_error',
                timestamp: new Date().toISOString(),
                url: url,
                userId: userId,
                stack: err.stack,
                details: {
                    name: err.name,
                    cause: err.cause,
                    response: err.response
                }
            };
            
            // Handle specific error types
            let errorMessage = err.message || ERROR_MESSAGES.GENERATION_FAILED;
            
            if (err.message?.includes('rate limit') || err.message?.includes('429')) {
                errorMessage = ERROR_MESSAGES.RATE_LIMIT;
                errorInfo.type = 'rate_limit';
            } else if (err.message?.includes('timeout') || err.message?.includes('timed out')) {
                errorMessage = ERROR_MESSAGES.TIMEOUT;
                errorInfo.type = 'timeout';
            } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
                errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
                errorInfo.type = 'network_error';
            } else if (err.message?.includes('ElevenLabs')) {
                errorInfo.type = 'elevenlabs_error';
                errorMessage = 'Audio generation failed: ' + err.message;
            } else if (err.message?.includes('AI') || err.message?.includes('summarization')) {
                errorInfo.type = 'ai_error';
                errorMessage = 'AI processing failed: ' + err.message;
            } else if (err.message?.includes('scraping') || err.message?.includes('webpage')) {
                errorInfo.type = 'scraping_error';
                errorMessage = 'Web scraping failed: ' + err.message;
            }
            
            setError(errorMessage);
            setErrorDetails(errorInfo);
        }
    }, []);

    /**
     * Reset state
     */
    const reset = useCallback(() => {
        setStatus('idle');
        setStatusMessage('');
        setPodcast(null);
        setError(null);
        setErrorDetails(null);
    }, []);

    /**
     * Check cache
     */
    const checkCache = useCallback(async (url) => {
        try {
            setStatus('generating');
            setStatusMessage('Checking cache...');

            const data = await podcastAPI.checkCache(url);

            if (data.cached && data.result) {
                setStatus('complete');
                setPodcast(data.result);
                return true;
            }

            setStatus('idle');
            return false;
        } catch (err) {
            setStatus('idle');
            return false;
        }
    }, []);

    return {
        status,
        statusMessage,
        podcast,
        error,
        errorDetails,
        generate,
        reset,
        checkCache,
    };
}