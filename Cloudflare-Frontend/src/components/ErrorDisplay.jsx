import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, Copy, Bug } from 'lucide-react';
import { useState } from 'react';

export function ErrorDisplay({ message, errorDetails, onRetry }) {
    const [showDetails, setShowDetails] = useState(false);
    const [copied, setCopied] = useState(false);

    const copyErrorDetails = () => {
        const errorText = JSON.stringify(errorDetails, null, 2);
        navigator.clipboard.writeText(errorText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getErrorTypeColor = (type) => {
        switch (type) {
            case 'elevenlabs_error': return 'text-red-600';
            case 'ai_error': return 'text-orange-600';
            case 'scraping_error': return 'text-yellow-600';
            case 'network_error': return 'text-blue-600';
            case 'rate_limit': return 'text-purple-600';
            case 'timeout': return 'text-gray-600';
            default: return 'text-red-600';
        }
    };

    const getErrorTypeLabel = (type) => {
        switch (type) {
            case 'elevenlabs_error': return 'Audio Generation Error';
            case 'ai_error': return 'AI Processing Error';
            case 'scraping_error': return 'Web Scraping Error';
            case 'network_error': return 'Network Error';
            case 'rate_limit': return 'Rate Limit Exceeded';
            case 'timeout': return 'Request Timeout';
            default: return 'Generation Error';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4"
        >
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-red-800">Error</h3>
                        {errorDetails?.type && (
                            <span className={`text-xs px-2 py-1 rounded-full ${getErrorTypeColor(errorDetails.type)} bg-red-100`}>
                                {getErrorTypeLabel(errorDetails.type)}
                            </span>
                        )}
                    </div>
                    
                    <p className="text-sm text-red-700 mb-4">{message}</p>
                    
                    {errorDetails && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <motion.button
                                    onClick={() => setShowDetails(!showDetails)}
                                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded-md hover:bg-red-100 transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Bug className="h-3 w-3" />
                                    {showDetails ? 'Hide' : 'Show'} Details
                                    {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </motion.button>
                                
                                <motion.button
                                    onClick={copyErrorDetails}
                                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded-md hover:bg-red-100 transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Copy className="h-3 w-3" />
                                    {copied ? 'Copied!' : 'Copy'}
                                </motion.button>
                            </div>
                            
                            {showDetails && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-white border border-red-200 rounded-lg p-3 text-xs space-y-2"
                                >
                                    <div>
                                        <strong className="text-red-800">Error Type:</strong> 
                                        <span className="ml-1 text-red-700">{errorDetails.type}</span>
                                    </div>
                                    <div>
                                        <strong className="text-red-800">Timestamp:</strong> 
                                        <span className="ml-1 text-red-700">{new Date(errorDetails.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <strong className="text-red-800">URL:</strong> 
                                        <span className="ml-1 text-red-700 break-all">{errorDetails.url}</span>
                                    </div>
                                    {errorDetails.details?.name && (
                                        <div>
                                            <strong className="text-red-800">Error Name:</strong> 
                                            <span className="ml-1 text-red-700">{errorDetails.details.name}</span>
                                        </div>
                                    )}
                                    {errorDetails.stack && (
                                        <div>
                                            <strong className="text-red-800">Stack Trace:</strong>
                                            <pre className="mt-1 whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded border">
                                                {errorDetails.stack}
                                            </pre>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    )}
                    
                    {onRetry && (
                        <motion.button
                            onClick={onRetry}
                            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Try Again
                        </motion.button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}