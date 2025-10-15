/**
 * Validate URL
 */
export function isValidUrl(url) {
    try {
        const urlObj = new URL(url);
        return (
            (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') &&
            !url.includes('chrome://') &&
            !url.includes('chrome-extension://')
        );
    } catch {
        return false;
    }
}

/**
 * Extract title from URL
 */
export function extractTitle(url) {
    try {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        const parts = path.split('/').filter(p => p);
        const lastPart = parts[parts.length - 1] || urlObj.hostname;

        return lastPart
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .replace(/\.[^.]+$/, '')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .substring(0, 60);
    } catch {
        return 'Article';
    }
}

/**
 * Extract website name from URL
 */
export function extractWebsiteName(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        
        // Remove www. prefix
        const cleanHostname = hostname.replace(/^www\./, '');
        
        // Extract domain name (remove subdomains for common cases)
        const parts = cleanHostname.split('.');
        if (parts.length > 2) {
            // For cases like blog.example.com, return example.com
            return parts.slice(-2).join('.');
        }
        
        return cleanHostname;
    } catch {
        return 'Unknown';
    }
}

/**
 * Truncate URL for display
 */
export function truncateUrl(url, maxLength = 60) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
}

/**
 * Format date for display
 */
export function formatDate(dateString) {
    try {
        if (!dateString) return 'Unknown date';

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';

        const now = new Date();
        const diff = now - date;

        // If the date is in the future or too far in the past, return formatted date
        if (diff < 0 || diff > 7 * 24 * 60 * 60 * 1000) {
            return new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }).format(date);
        }

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;

        return date.toLocaleDateString();
    } catch (error) {
        console.error('Date formatting error:', error);
        return 'Unknown date';
    }
}

/**
 * Format time duration
 */
export function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}