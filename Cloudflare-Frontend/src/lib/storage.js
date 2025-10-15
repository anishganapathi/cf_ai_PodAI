/**
 * Chrome Storage wrapper for managing extension data
 */
class ChromeStorage {
    /**
     * Get user ID or create new one
     */
    async getUserId() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['userId'], (result) => {
                if (result.userId) {
                    resolve(result.userId);
                } else {
                    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    chrome.storage.local.set({ userId }, () => {
                        resolve(userId);
                    });
                }
            });
        });
    }

    /**
     * Get history
     */
    async getHistory() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['history'], (result) => {
                resolve(result.history || []);
            });
        });
    }

    /**
     * Save to history
     */
    async saveToHistory(podcast) {
        const history = await this.getHistory();

        // Check if already exists
        const exists = history.some(item => item.url === podcast.url);
        if (exists) {
            return history;
        }

        // Add to beginning
        history.unshift({
            url: podcast.url,
            title: podcast.title,
            audioUrl: podcast.audioUrl,
            createdAt: podcast.createdAt || new Date().toISOString(),
        });

        // Keep only last 20
        const trimmedHistory = history.slice(0, 20);

        return new Promise((resolve) => {
            chrome.storage.local.set({ history: trimmedHistory }, () => {
                resolve(trimmedHistory);
            });
        });
    }

    /**
     * Clear history
     */
    async clearHistory() {
        return new Promise((resolve) => {
            chrome.storage.local.set({ history: [] }, () => {
                resolve([]);
            });
        });
    }

    /**
     * Delete specific podcast from history
     */
    async deleteFromHistory(url) {
        const history = await this.getHistory();
        const updatedHistory = history.filter(item => item.url !== url);
        
        return new Promise((resolve) => {
            chrome.storage.local.set({ history: updatedHistory }, () => {
                resolve(updatedHistory);
            });
        });
    }

    /**
     * Get current tab URL
     */
    async getCurrentTabUrl() {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                resolve(tabs[0]?.url || '');
            });
        });
    }
}

export const chromeStorage = new ChromeStorage();