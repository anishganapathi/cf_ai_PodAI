import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, Download, Save, CheckCircle, Headphones, Trash2, Loader2 } from 'lucide-react';
import { formatDuration, formatDate } from '../lib/helpers';

export function PodcastPlayer({ podcast, onDelete }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isSaved, setIsSaved] = useState(true); // Auto-saved by default
    const [isReady, setIsReady] = useState(false);

    const audioRef = useRef(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        console.log('PodcastPlayer: Setting up audio with URL:', podcast.audioUrl);

        // Reset state when audio source changes
        setIsPlaying(false);
        setIsReady(false);
        setCurrentTime(0);
        setDuration(0);

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };
        
        const handleDurationChange = () => {
            console.log('Audio duration loaded:', audio.duration);
            if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
                setDuration(audio.duration);
                setIsReady(true);
            }
        };
        
        const handleLoadedMetadata = () => {
            console.log('Audio metadata loaded:', audio.duration);
            if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
                setDuration(audio.duration);
                setIsReady(true);
            }
        };
        
        const handleCanPlay = () => {
            console.log('Audio can play');
            setIsReady(true);
        };
        
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };
        
        const handleError = (e) => {
            console.error('Audio error:', e);
            console.error('Audio error details:', {
                error: audio.error,
                networkState: audio.networkState,
                readyState: audio.readyState,
                src: audio.src
            });
            setIsReady(false);
        };

        // Add event listeners
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('durationchange', handleDurationChange);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('durationchange', handleDurationChange);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
        };
    }, [podcast.audioUrl]);

    const togglePlay = async () => {
        const audio = audioRef.current;
        
        if (!audio) {
            console.error('Audio element not found');
            return;
        }

        // If audio is not ready, try to load it first
        if (!isReady) {
            console.log('Audio not ready, attempting to load...');
            try {
                await audio.load();
                // Wait a bit for metadata to load
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error('Failed to load audio:', error);
                // Fallback: open in external browser
                window.open(podcast.audioUrl, '_blank');
                return;
            }
        }

        try {
            if (isPlaying) {
                audio.pause();
                setIsPlaying(false);
            } else {
                console.log('Attempting to play audio:', audio.src);
                await audio.play();
                setIsPlaying(true);
            }
        } catch (error) {
            console.error('Playback error:', error);
            console.error('Audio state:', {
                currentTime: audio.currentTime,
                duration: audio.duration,
                readyState: audio.readyState,
                networkState: audio.networkState,
                error: audio.error,
                src: audio.src
            });
            
            // Fallback: open in external browser if inline playback fails
            console.log('Falling back to external playback');
            window.open(podcast.audioUrl, '_blank');
            setIsPlaying(false);
        }
    };

    const handleSeek = (e) => {
        const audio = audioRef.current;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        audio.currentTime = percentage * duration;
    };

    const skip = (seconds) => {
        const audio = audioRef.current;
        audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        audioRef.current.volume = newVolume;
    };

    const handleDownload = () => {
        const a = document.createElement('a');
        a.href = podcast.audioUrl;
        a.download = `${podcast.title || 'podcast'}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // Remove handleSave since we auto-save now

    const handleDelete = async () => {
        if (onDelete) {
            await onDelete(podcast.url);
        }
    };

        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
            >
                {/* Audio element */}
                <audio
                    ref={audioRef}
                    src={podcast.audioUrl}
                    preload="metadata"
                    onLoadStart={() => console.log('Audio load started')}
                    onLoadedMetadata={() => console.log('Audio metadata loaded')}
                    onCanPlay={() => console.log('Audio can play')}
                    onError={(e) => {
                        console.error('Audio load error:', e);
                        console.error('Audio src:', podcast.audioUrl);
                        console.error('Audio element:', audioRef.current);
                    }}
                />

                {/* Header */}
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Headphones className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg text-gray-900 line-clamp-2 mb-1" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600 }}>
                            {podcast.title || 'Generated Podcast'}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {formatDate(podcast.createdAt)}
                        </p>
                    </div>
                    {isSaved && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center gap-1 text-green-500 text-sm"
                        >
                            <CheckCircle className="w-4 h-4" />
                            <span>Saved</span>
                        </motion.div>
                    )}
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                    <div
                        className="w-full h-3 bg-gray-200 rounded-full cursor-pointer group relative"
                        onClick={handleSeek}
                    >
                        <motion.div
                            className="h-full bg-blue-500 rounded-full relative"
                            style={{ width: `${progress}%` }}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.1 }}
                        >
                            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 border-2 border-blue-500" />
                        </motion.div>
                        
                        {/* Progress percentage indicator */}
                        {progress > 0 && (
                            <div className="absolute top-0 left-0 h-full flex items-center justify-center text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ fontFamily: 'Syne, sans-serif', fontWeight: 500, left: `${Math.min(progress, 90)}%` }}>
                                {Math.round(progress)}%
                            </div>
                        )}
                    </div>
                    
                    {/* Time stamps */}
                    <div className="flex justify-between text-sm mt-2">
                        <span className="text-blue-600" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 500 }}>
                            {formatDuration(currentTime)}
                        </span>
                        <span className="text-gray-500">
                            {duration > 0 ? formatDuration(duration) : '--:--'}
                        </span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Back 10s */}
                        <motion.button
                            onClick={() => skip(-10)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            title="Back 10 seconds"
                        >
                            <SkipBack className="w-5 h-5" />
                        </motion.button>

                        {/* Play/Pause */}
                        <motion.button
                            onClick={togglePlay}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                                isReady
                                    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-200'
                                    : 'bg-gray-400 hover:bg-gray-500 text-white shadow-lg shadow-gray-200'
                            }`}
                            whileHover={{ scale: isReady ? 1.05 : 1 }}
                            whileTap={{ scale: isReady ? 0.95 : 1 }}
                            title={isPlaying ? 'Pause' : isReady ? 'Play' : 'Loading...'}
                        >
                            {!isReady ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : isPlaying ? (
                                <Pause className="w-6 h-6 ml-0.5" />
                            ) : (
                                <Play className="w-6 h-6 ml-0.5" />
                            )}
                        </motion.button>

                        {/* Forward 10s */}
                        <motion.button
                            onClick={() => skip(10)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            title="Forward 10 seconds"
                        >
                            <SkipForward className="w-5 h-5" />
                        </motion.button>
                    </div>

                    {/* Volume */}
                    <div className="flex items-center gap-3">
                        <Volume2 className={`w-4 h-4 transition-colors flex-shrink-0 ${
                            volume === 0 ? 'text-red-400' : 
                            volume < 0.5 ? 'text-yellow-400' : 
                            'text-green-400'
                        }`} />
                        <div className="relative w-20 flex items-center">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={volume}
                                onChange={handleVolumeChange}
                                className="w-full h-1 rounded-full appearance-none cursor-pointer 
                                    [&::-webkit-slider-thumb]:appearance-none 
                                    [&::-webkit-slider-thumb]:w-4 
                                    [&::-webkit-slider-thumb]:h-4 
                                    [&::-webkit-slider-thumb]:rounded-full 
                                    [&::-webkit-slider-thumb]:cursor-pointer
                                    [&::-webkit-slider-thumb]:transition-colors
                                    [&::-webkit-slider-thumb]:shadow-sm
                                    [&::-webkit-slider-thumb]:border-2
                                    [&::-webkit-slider-thumb]:border-white
                                    [&::-webkit-slider-thumb]:transform
                                    [&::-webkit-slider-thumb]:-translate-y-1.5"
                                style={{
                                    '--thumb-color': volume === 0 ? '#ef4444' : 
                                                   volume < 0.5 ? '#eab308' : 
                                                   '#22c55e'
                                }}
                            />
                            <div className="absolute top-0 left-0 h-1 rounded-full pointer-events-none transition-colors"
                                style={{ 
                                    width: `${volume * 100}%`,
                                    background: volume === 0 ? '#ef4444' : 
                                              volume < 0.5 ? '#eab308' : 
                                              '#22c55e'
                                }}
                            />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right flex-shrink-0">
                            {Math.round(volume * 100)}%
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <motion.button
                            onClick={handleDownload}
                            className="p-2 text-gray-400 hover:text-green-500 transition-colors rounded-lg hover:bg-gray-100"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            title="Download"
                        >
                            <Download className="w-5 h-5" />
                        </motion.button>
                        {/* Save button removed - auto-saved */}
                        {onDelete && (
                            <motion.button
                                onClick={handleDelete}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                title="Delete podcast"
                            >
                                <Trash2 className="w-5 h-5" />
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.div>
        );
}