import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../utils/cn';

interface Props {
    date: Date | null;
    isLoading?: boolean;
    className?: string;
}

const LastUpdated: React.FC<Props> = ({ date, isLoading, className }) => {
    if (isLoading) {
        return (
            <div className={cn("flex items-center gap-1.5 text-xs text-blue-400 animate-pulse", className)}>
                <Clock className="w-3 h-3 animate-spin" />
                <span>Updating...</span>
            </div>
        );
    }

    if (!date) return null;

    // Format: "Dec 21, 2024 at 2:45 PM IST"
    const formatted = new Intl.DateTimeFormat('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        timeZone: 'Asia/Kolkata',
        timeZoneName: 'short'
    }).format(date);

    return (
        <div className={cn("flex items-center gap-1.5 text-xs text-slate-500", className)}>
            <Clock className="w-3 h-3" />
            <span>Last updated: {formatted}</span>
        </div>
    );
};

export default LastUpdated;
