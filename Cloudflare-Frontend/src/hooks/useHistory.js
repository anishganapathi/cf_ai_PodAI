import { useState, useEffect, useCallback } from 'react';
import { chromeStorage } from '../lib/storage';

export function useHistory() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    /**
     * Load history
     */
    const loadHistory = useCallback(async () => {
        try {
            setLoading(true);
            const data = await chromeStorage.getHistory();
            setHistory(data);
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Save to history
     */
    const saveToHistory = useCallback(async (podcast) => {
        try {
            const updatedHistory = await chromeStorage.saveToHistory(podcast);
            setHistory(updatedHistory);
            return true;
        } catch (err) {
            console.error('Failed to save to history:', err);
            return false;
        }
    }, []);

    /**
     * Clear history
     */
    const clearHistory = useCallback(async () => {
        try {
            await chromeStorage.clearHistory();
            setHistory([]);
            return true;
        } catch (err) {
            console.error('Failed to clear history:', err);
            return false;
        }
    }, []);

    /**
     * Delete specific podcast from history
     */
    const deleteFromHistory = useCallback(async (url) => {
        try {
            const updatedHistory = await chromeStorage.deleteFromHistory(url);
            setHistory(updatedHistory);
            return true;
        } catch (err) {
            console.error('Failed to delete from history:', err);
            return false;
        }
    }, []);

    // Load on mount
    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    return {
        history,
        loading,
        saveToHistory,
        clearHistory,
        deleteFromHistory,
        reloadHistory: loadHistory,
    };
}