-- Podcast Database Schema for D1
-- This schema replaces the KV storage with proper relational database structure

-- Table for storing podcast metadata and content
CREATE TABLE IF NOT EXISTS podcasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,                    -- Original article URL
    title TEXT NOT NULL,                        -- Article/podcast title
    summary TEXT NOT NULL,                      -- AI-generated podcast script
    audio_file_name TEXT NOT NULL,              -- Audio file name in R2 storage
    audio_url TEXT,                             -- Full audio URL (computed)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT DEFAULT 'anonymous',           -- User identifier
    status TEXT DEFAULT 'completed',            -- Status: processing, completed, failed
    processing_time_ms INTEGER,                 -- Time taken to process in milliseconds
    content_length INTEGER,                     -- Length of scraped content
    summary_length INTEGER,                     -- Length of generated summary
    audio_size_bytes INTEGER,                   -- Size of audio file in bytes
    cache_key TEXT UNIQUE                       -- Generated cache key for URL
);

-- Table for storing user preferences and history
CREATE TABLE IF NOT EXISTS user_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    podcast_id INTEGER NOT NULL,
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (podcast_id) REFERENCES podcasts(id) ON DELETE CASCADE
);

-- Table for storing processing errors and logs
CREATE TABLE IF NOT EXISTS processing_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    podcast_id INTEGER,
    url TEXT,
    error_type TEXT,                            -- scraping, ai, audio_generation, storage
    error_message TEXT,
    stack_trace TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (podcast_id) REFERENCES podcasts(id) ON DELETE SET NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_podcasts_url ON podcasts(url);
CREATE INDEX IF NOT EXISTS idx_podcasts_user_id ON podcasts(user_id);
CREATE INDEX IF NOT EXISTS idx_podcasts_created_at ON podcasts(created_at);
CREATE INDEX IF NOT EXISTS idx_podcasts_cache_key ON podcasts(cache_key);
CREATE INDEX IF NOT EXISTS idx_user_history_user_id ON user_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_history_podcast_id ON user_history(podcast_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_podcast_id ON processing_logs(podcast_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_url ON processing_logs(url);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_podcasts_timestamp 
    AFTER UPDATE ON podcasts
    FOR EACH ROW
    BEGIN
        UPDATE podcasts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
