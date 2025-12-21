import React, { useState, useMemo } from 'react';
import { NewsItem } from '../services/types';
import { Search, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { cn } from '../utils/cn';
import LastUpdated from './LastUpdated';

interface Props {
    news: NewsItem[];
    lastUpdated: Date | null;
    isLoading: boolean;
    onRefresh: () => void;
}

type FilterType = 'All' | 'Positive' | 'Negative' | 'My Watchlist';

const PortfolioNews: React.FC<Props> = ({ news, lastUpdated, isLoading, onRefresh }) => {
    const [filter, setFilter] = useState<FilterType>('All');

    const filteredNews = useMemo(() => {
        if (filter === 'All') return news;
        if (filter === 'My Watchlist') return news; // Ideally filter by watchlist if implemented
        return news.filter(item => item.sentiment.toLowerCase() === filter.toLowerCase());
    }, [news, filter]);

    // Sort by date (newest first)
    const sortedNews = [...filteredNews].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        📰 Portfolio News
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        AI-curated insights for your holdings
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <LastUpdated date={lastUpdated} isLoading={isLoading} />
                    <button
                        onClick={onRefresh}
                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {['All', 'Positive', 'Negative'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as FilterType)}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                            filter === f
                                ? "bg-blue-600 text-white"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        )}
                    >
                        {f} {f !== 'All' && 'News'}
                    </button>
                ))}
            </div>

            {/* News List */}
            <div className="space-y-4">
                {sortedNews.length > 0 ? (
                    sortedNews.map((item) => (
                        <NewsCard key={item.id} item={item} />
                    ))
                ) : (
                    <div className="text-center py-12 text-slate-500 bg-slate-950/50 rounded-lg border border-slate-800/50">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No recent news found applying to this filter.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const NewsCard: React.FC<{ item: NewsItem }> = ({ item }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const sentimentColor = item.sentiment === 'positive' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
        item.sentiment === 'negative' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
            'text-slate-400 border-slate-500/30 bg-slate-500/10';

    return (
        <div className="group border border-slate-800 bg-slate-950 rounded-lg p-4 hover:border-slate-700 transition-colors">
            <div className="flex justify-between items-start gap-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded text-xs">
                            {item.symbol}
                        </span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border", sentimentColor)}>
                            {item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1)}
                        </span>
                        <span className="text-xs text-slate-500">
                            {item.source} • {getTimeAgo(item.timestamp)}
                        </span>
                    </div>

                    <h3 className="text-slate-200 font-medium leading-snug group-hover:text-blue-400 transition-colors">
                        {item.headline}
                    </h3>

                    {!isExpanded && (
                        <p className="text-sm text-slate-500 mt-2 line-clamp-1">
                            {item.summary}
                        </p>
                    )}
                </div>

                <button className="text-slate-600 group-hover:text-slate-400 mt-1">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
            </div>

            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-800/50 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-blue-900/10 border-l-2 border-blue-500 pl-3 py-2 rounded-r mb-3">
                        <p className="text-sm text-slate-300 italic">
                            "{item.summary}"
                        </p>
                    </div>
                    <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 hover:underline"
                    >
                        Read full article on {item.source} <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            )}
        </div>
    );
};

function getTimeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

export default PortfolioNews;
