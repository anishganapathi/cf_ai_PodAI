import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Link2, 
    Sparkles, 
    Zap, 
    Play, 
    Pause, 
    Trash2, 
    Clock, 
    Loader2,
    CheckCircle,
    AlertCircle,
    Mic,
    Headphones,
    Download,
    MoreHorizontal
} from 'lucide-react';
import { usePodcastGenerator } from '../hooks/usePodcastGenerator';
import { useHistory } from '../hooks/useHistory';
import { chromeStorage } from '../lib/storage';
import { isValidUrl, extractWebsiteName } from '../lib/helpers';
import { PodcastPlayer } from '../components/PodcastPlayer';
import { ErrorDisplay } from '../components/ErrorDisplay';

export default function PopupPage() {
    const [currentUrl, setCurrentUrl] = useState('');
    const [inputUrl, setInputUrl] = useState('');
    const [userId, setUserId] = useState('');
    const [isValidPage, setIsValidPage] = useState(false);

    const {
        status,
        progress,
        statusMessage,
        podcast,
        error,
        errorDetails,
        generate,
        reset,
        checkCache,
    } = usePodcastGenerator();

    const {
        history,
        saveToHistory,
        deleteFromHistory,
        clearHistory,
    } = useHistory();

    // Initialize: Get current URL and check validity
    useEffect(() => {
        async function initialize() {
            try {
                // Get current tab URL
                const url = await chromeStorage.getCurrentTabUrl();
                setCurrentUrl(url);
                setInputUrl(url);

                // Validate URL
                const valid = isValidUrl(url);
                setIsValidPage(valid);

                if (valid) {
                    // Get or create user ID
                    const id = await chromeStorage.getUserId();
                    setUserId(id);

                    // Check if already cached
                    await checkCache(url);
                }
            } catch (err) {
                console.error('Initialization error:', err);
                setIsValidPage(false);
            }
        }

        initialize();
    }, [checkCache]);

    // Handle generate button click
    const handleGenerate = async () => {
        const url = inputUrl || currentUrl;
        if (!url || !userId) return;

        // Validate URL before proceeding
        if (!isValidUrl(url)) {
            setIsValidPage(false);
            return;
        }

        // Generate with auto-save to history
        await generate(url, userId, saveToHistory);
    };

    // Handle save to history
    const handleSave = async (podcastData) => {
        return await saveToHistory(podcastData);
    };

    // Handle delete podcast
    const handleDeletePodcast = async (url) => {
        await deleteFromHistory(url);
    };

    // Handle clear all history
    const handleClearHistory = async () => {
        await clearHistory();
    };

    return (
        <div className="w-[600px] min-h-[600px] bg-white">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img 
                            src="/icons/MainLogo.png" 
                            alt="Podcast AI Logo" 
                            className="w-8 h-8 rounded-lg"
                        />
                        <img 
                            src="/icons/PodAI.png" 
                            alt="PodAI" 
                            className="h-6"
                        />
                    </div>
                    {history && history.length > 0 && (
                        <button
                            onClick={handleClearHistory}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            title="Clear all history"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* URL Input Section */}
                <div className="space-y-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Link2 className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={inputUrl}
                            onChange={(e) => {
                                setInputUrl(e.target.value);
                                setIsValidPage(isValidUrl(e.target.value));
                            }}
                            placeholder="Enter article URL..."
                            className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        />
                        {isValidPage && (
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            </div>
                        )}
                    </div>

                    {/* Generate Button */}
                    <motion.button
                        onClick={handleGenerate}
                        disabled={status === 'generating' || !isValidPage}
                        className="w-full py-4 px-6 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-3"
                        whileHover={status !== 'generating' && isValidPage ? { scale: 1.02 } : {}}
                        whileTap={status !== 'generating' && isValidPage ? { scale: 0.98 } : {}}
                    >
                        {status === 'generating' ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creating Podcast...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                Generate Podcast
                            </>
                        )}
                    </motion.button>
                </div>

                {/* Progress Section */}
                <AnimatePresence>
                    {status === 'generating' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3"
                        >
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">
                                        {statusMessage || 'Processing...'}
                                    </span>
                                    <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <motion.div
                                        className="bg-blue-500 h-2 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Podcast Player */}
                <AnimatePresence>
                    {status === 'complete' && podcast && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <PodcastPlayer podcast={podcast} onDelete={handleDeletePodcast} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error Display */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <ErrorDisplay 
                                message={error} 
                                errorDetails={errorDetails}
                                onRetry={() => {
                                    reset();
                                    handleGenerate();
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* History Section */}
                {history && history.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-gray-500" />
                            <h2 className="text-lg text-gray-900" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600 }}>Recent Podcasts</h2>
                        </div>
                        
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            <AnimatePresence>
                                {history.slice(0, 5).map((item, index) => (
                                    <motion.div
                                        key={item.url}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="group flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200"
                                    >
                                        <div className="flex-shrink-0">
                                            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                                <Headphones className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {item.title || 'Generated Podcast'}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="font-medium text-blue-600">
                                                    {extractWebsiteName(item.url)}
                                                </span>
                                                <span>•</span>
                                                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => window.open(item.audioUrl, '_blank')}
                                                className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                                title="Play"
                                            >
                                                <Play className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const a = document.createElement('a');
                                                    a.href = item.audioUrl;
                                                    a.download = `${item.title || 'podcast'}.mp3`;
                                                    a.click();
                                                }}
                                                className="p-2 text-gray-400 hover:text-green-500 transition-colors"
                                                title="Download"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeletePodcast(item.url)}
                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {history && history.length === 0 && status !== 'generating' && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mic className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg text-gray-900 mb-2" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 500 }}>No podcasts yet</h3>
                        <p className="text-gray-500 text-sm">Generate your first podcast from any article!</p>
                    </div>
                )}

                {/* Footer */}
                <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Zap className="w-4 h-4" />
                        Powered by Cloudflare Workers AI
                    </div>
                </div>
            </div>
        </div>
    );
}