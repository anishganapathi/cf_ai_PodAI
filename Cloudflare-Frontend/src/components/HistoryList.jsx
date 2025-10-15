import { ScrollArea } from '../components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Clock, Play, Trash2 } from 'lucide-react';
import { formatDate, extractWebsiteName } from '../lib/helpers';
import { cn } from '../lib/utils';

export function HistoryList({ history, onSelect, onClear, loading }) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Recent Podcasts
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-sm text-muted-foreground">
                        Loading...
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (history.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Recent Podcasts
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-sm text-muted-foreground">
                        No podcasts yet. Generate your first one!
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent Podcasts
                </CardTitle>
                {onClear && history.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClear}
                        className="h-8 px-2 text-xs"
                    >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[240px] pr-3">
                    <div className="space-y-2">
                        {history.map((item, index) => (
                            <HistoryItem
                                key={index}
                                item={item}
                                onClick={() => onSelect(item)}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

function HistoryItem({ item, onClick }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left p-3 rounded-lg transition-all duration-200",
                "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700",
                "border-2 border-transparent hover:border-purple-500",
                "transform hover:translate-x-1"
            )}
        >
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <Play className="h-4 w-4 text-white ml-0.5" />
                    </div>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm line-clamp-2" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 500 }}>
                        {item.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="text-blue-600" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 500 }}>
                            {extractWebsiteName(item.url)}
                        </span>
                        <span>•</span>
                        <span>{formatDate(item.createdAt)}</span>
                    </div>
                </div>
            </div>
        </button>
    );
}