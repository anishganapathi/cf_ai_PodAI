/**
 * Database utility functions for D1 operations
 * Replaces KV storage with proper relational database operations
 */

/**
 * Initialize database schema
 */
export async function initializeDatabase(db) {
    try {
        console.log('Initializing database schema...');
        
        // Create podcasts table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS podcasts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                summary TEXT NOT NULL,
                audio_file_name TEXT NOT NULL,
                audio_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                user_id TEXT DEFAULT 'anonymous',
                status TEXT DEFAULT 'completed',
                processing_time_ms INTEGER,
                content_length INTEGER,
                summary_length INTEGER,
                audio_size_bytes INTEGER,
                cache_key TEXT UNIQUE
            )
        `);

        // Create user_history table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS user_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                podcast_id INTEGER NOT NULL,
                accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (podcast_id) REFERENCES podcasts(id) ON DELETE CASCADE
            )
        `);

        // Create processing_logs table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS processing_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                podcast_id INTEGER,
                url TEXT,
                error_type TEXT,
                error_message TEXT,
                stack_trace TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (podcast_id) REFERENCES podcasts(id) ON DELETE SET NULL
            )
        `);

        // Create indexes
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_podcasts_url ON podcasts(url)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_podcasts_user_id ON podcasts(user_id)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_podcasts_created_at ON podcasts(created_at)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_podcasts_cache_key ON podcasts(cache_key)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_user_history_user_id ON user_history(user_id)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_user_history_podcast_id ON user_history(podcast_id)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_processing_logs_podcast_id ON processing_logs(podcast_id)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_processing_logs_url ON processing_logs(url)`);

        // Create trigger for updated_at
        await db.exec(`
            CREATE TRIGGER IF NOT EXISTS update_podcasts_timestamp 
                AFTER UPDATE ON podcasts
                FOR EACH ROW
                BEGIN
                    UPDATE podcasts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END
        `);

        console.log('Database schema initialized successfully');
        return true;
    } catch (error) {
        console.error('Database initialization error:', error);
        return false;
    }
}

/**
 * Save podcast data to database
 */
export async function savePodcast(db, podcastData) {
    try {
        const {
            url,
            title,
            summary,
            audioFileName,
            audioUrl,
            userId = 'anonymous',
            status = 'completed',
            processingTimeMs,
            contentLength,
            summaryLength,
            audioSizeBytes,
            cacheKey
        } = podcastData;

        const result = await db.prepare(`
            INSERT INTO podcasts (
                url, title, summary, audio_file_name, audio_url, user_id, 
                status, processing_time_ms, content_length, summary_length, 
                audio_size_bytes, cache_key
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            url, title, summary, audioFileName, audioUrl, userId,
            status, processingTimeMs, contentLength, summaryLength,
            audioSizeBytes, cacheKey
        ).run();

        console.log(`Podcast saved with ID: ${result.meta.last_row_id}`);
        return {
            success: true,
            id: result.meta.last_row_id,
            changes: result.meta.changes
        };
    } catch (error) {
        console.error('Save podcast error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get podcast by URL
 */
export async function getPodcastByUrl(db, url) {
    try {
        const result = await db.prepare(`
            SELECT * FROM podcasts WHERE url = ?
        `).bind(url).first();

        if (result) {
            // Convert database row to API format
            return {
                success: true,
                data: {
                    id: result.id,
                    url: result.url,
                    title: result.title,
                    summary: result.summary,
                    audioFileName: result.audio_file_name,
                    audioUrl: result.audio_url,
                    createdAt: result.created_at,
                    userId: result.user_id,
                    status: result.status,
                    processingTimeMs: result.processing_time_ms,
                    contentLength: result.content_length,
                    summaryLength: result.summary_length,
                    audioSizeBytes: result.audio_size_bytes,
                    cacheKey: result.cache_key
                }
            };
        }

        return { success: false, data: null };
    } catch (error) {
        console.error('Get podcast by URL error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get podcast by cache key
 */
export async function getPodcastByCacheKey(db, cacheKey) {
    try {
        const result = await db.prepare(`
            SELECT * FROM podcasts WHERE cache_key = ?
        `).bind(cacheKey).first();

        if (result) {
            return {
                success: true,
                data: {
                    id: result.id,
                    url: result.url,
                    title: result.title,
                    summary: result.summary,
                    audioFileName: result.audio_file_name,
                    audioUrl: result.audio_url,
                    createdAt: result.created_at,
                    userId: result.user_id,
                    status: result.status,
                    processingTimeMs: result.processing_time_ms,
                    contentLength: result.content_length,
                    summaryLength: result.summary_length,
                    audioSizeBytes: result.audio_size_bytes,
                    cacheKey: result.cache_key
                }
            };
        }

        return { success: false, data: null };
    } catch (error) {
        console.error('Get podcast by cache key error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get user's podcast history
 */
export async function getUserHistory(db, userId, limit = 50) {
    try {
        const result = await db.prepare(`
            SELECT p.*, uh.accessed_at as last_accessed
            FROM podcasts p
            LEFT JOIN user_history uh ON p.id = uh.podcast_id AND uh.user_id = ?
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC
            LIMIT ?
        `).bind(userId, userId, limit).all();

        return {
            success: true,
            data: result.results.map(row => ({
                id: row.id,
                url: row.url,
                title: row.title,
                summary: row.summary,
                audioFileName: row.audio_file_name,
                audioUrl: row.audio_url,
                createdAt: row.created_at,
                userId: row.user_id,
                status: row.status,
                processingTimeMs: row.processing_time_ms,
                contentLength: row.content_length,
                summaryLength: row.summary_length,
                audioSizeBytes: row.audio_size_bytes,
                cacheKey: row.cache_key,
                lastAccessed: row.last_accessed
            }))
        };
    } catch (error) {
        console.error('Get user history error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Record user access to podcast
 */
export async function recordUserAccess(db, userId, podcastId) {
    try {
        await db.prepare(`
            INSERT INTO user_history (user_id, podcast_id)
            VALUES (?, ?)
        `).bind(userId, podcastId).run();

        return { success: true };
    } catch (error) {
        console.error('Record user access error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Log processing error
 */
export async function logProcessingError(db, errorData) {
    try {
        const {
            podcastId = null,
            url,
            errorType,
            errorMessage,
            stackTrace
        } = errorData;

        await db.prepare(`
            INSERT INTO processing_logs (podcast_id, url, error_type, error_message, stack_trace)
            VALUES (?, ?, ?, ?, ?)
        `).bind(podcastId, url, errorType, errorMessage, stackTrace).run();

        return { success: true };
    } catch (error) {
        console.error('Log processing error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get podcast statistics
 */
export async function getPodcastStats(db) {
    try {
        const stats = await db.prepare(`
            SELECT 
                COUNT(*) as total_podcasts,
                COUNT(DISTINCT user_id) as unique_users,
                AVG(processing_time_ms) as avg_processing_time,
                SUM(audio_size_bytes) as total_audio_size,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_podcasts,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_podcasts
            FROM podcasts
        `).first();

        return {
            success: true,
            data: {
                totalPodcasts: stats.total_podcasts,
                uniqueUsers: stats.unique_users,
                avgProcessingTime: Math.round(stats.avg_processing_time || 0),
                totalAudioSize: stats.total_audio_size || 0,
                completedPodcasts: stats.completed_podcasts,
                failedPodcasts: stats.failed_podcasts
            }
        };
    } catch (error) {
        console.error('Get podcast stats error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generate cache key from URL (same logic as before)
 */
export function generateCacheKey(url) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        const char = url.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}
