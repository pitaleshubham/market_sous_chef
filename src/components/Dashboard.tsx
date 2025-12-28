import React, { useState, useMemo } from 'react';
import { authenticate, fetchHoldings, getLivePrices, AngelCredentials, PortfolioHolding, StockAnalysis, NewsItem } from '../services/angelService';
import CredentialForm from './CredentialForm';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { cn } from '../utils/cn';
import { fetchStockNews } from '../services/newsService';
import PortfolioNews from './PortfolioNews';
import LastUpdated from './LastUpdated';

const Dashboard: React.FC = () => {
    type SortOption = 'impact' | 'pnl' | 'invested' | 'dayChange' | 'ltp';
    const [credentials, setCredentials] = useState<AngelCredentials | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
    const [livePrices, setLivePrices] = useState<Record<string, { ltp: number, close: number }>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isPriceLoading, setIsPriceLoading] = useState(false);
    const [isNewsLoading, setIsNewsLoading] = useState(false);
    const [newsData, setNewsData] = useState<NewsItem[]>([]);
    const [error, setError] = useState<string | undefined>();
    const [sortBy, setSortBy] = useState<SortOption>('impact');

    // Timestamps
    const [pfLastUpdated, setPfLastUpdated] = useState<Date | null>(null);
    const [newsLastUpdated, setNewsLastUpdated] = useState<Date | null>(null);

    const handleConnect = async (creds: AngelCredentials) => {
        setIsLoading(true);
        setError(undefined);
        try {
            // 1. Get Token (if not already valid, but simplicity we re-login on explicit refresh)
            const jwt = await authenticate(creds);
            setToken(jwt);

            // 2. Fetch Holdings
            const data = await fetchHoldings(jwt, creds.apiKey);
            setHoldings(data);
            setPfLastUpdated(new Date());

            // Only set credentials AFTER we confirm we have data access
            setCredentials(creds);

            // Stop Loading here to show UI immediately
            setIsLoading(false);

            // 3. Fetch Live Prices (Background)
            updateLivePrices(jwt, creds.apiKey, data);

            // Trigger News Fetch (Background)
            refetchNews(data);
        } catch (err: any) {
            console.error("Login Error:", err);
            setError(err.message || "Failed to fetch portfolio. Check credentials.");
            setCredentials(null); // Ensure we stay on login screen
            setIsLoading(false);
        }
    };

    const updateLivePrices = async (jwt: string, apiKey: string, stocks: PortfolioHolding[]) => {
        setIsPriceLoading(true);
        try {
            const prices = await getLivePrices(jwt, apiKey, stocks);
            setLivePrices(prices);
            setPfLastUpdated(new Date());
        } catch (e) {
            console.error("Failed to update live prices", e);
        } finally {
            setIsPriceLoading(false);
        }
    };

    const refetchNews = async (stocks: PortfolioHolding[]) => {
        setIsNewsLoading(true);
        const allNews: NewsItem[] = [];
        // Fetch in parallel
        await Promise.all(stocks.map(async (stock) => {
            try {
                const items = await fetchStockNews(stock.tradingsymbol);
                allNews.push(...items);
            } catch (e) {
                console.error(`Failed to fetch news for ${stock.tradingsymbol}`);
            }
        }));
        setNewsData(allNews);
        setNewsLastUpdated(new Date());
        setIsNewsLoading(false);
    };

    // Analyze Data
    const analysis = useMemo(() => {
        // Always return a valid object even if empty, so we render the dashboard
        const emptyAnalysis = {
            totalValue: 0, totalInvested: 0, totalPnl: 0, totalDayGL: 0, totalDayGLPercent: 0,
            analyzedStocks: [], topGainers: [], topLosers: []
        };

        if (!holdings.length) return emptyAnalysis;

        let totalValue = 0;
        let totalInvested = 0;
        let totalDayGL = 0;

        const analyzedStocks: StockAnalysis[] = holdings.map(h => {
            // Use Live Price if available, else fallback to Holding's LTP (which is static/snapshot)
            const liveData = livePrices[h.tradingsymbol];
            const currentLtp = liveData ? liveData.ltp : h.ltp;
            const previousClose = liveData ? liveData.close : h.close || h.ltp; // Fallback prevents NaN

            const currentValue = h.quantity * currentLtp;
            const investedValue = h.quantity * h.averageprice;

            totalValue += currentValue;
            totalInvested += investedValue;

            const dayGL = (currentLtp - previousClose) * h.quantity;
            totalDayGL += dayGL;

            const dayChangePercent = previousClose ? ((currentLtp - previousClose) / previousClose) * 100 : 0;

            return {
                symbol: h.tradingsymbol,
                quantity: h.quantity,
                currentValue,
                investedValue,
                pnl: currentValue - investedValue,
                pnlPercent: investedValue ? ((currentValue - investedValue) / investedValue) * 100 : 0,
                dayChangePercent: dayChangePercent,
                portfolioImpact: dayGL,
            };
        });

        const totalPnl = totalValue - totalInvested;

        const sortedByImpact = [...analyzedStocks];

        // Sorting Logic
        if (sortBy === 'impact') {
            sortedByImpact.sort((a, b) => b.portfolioImpact - a.portfolioImpact);
        } else if (sortBy === 'pnl') {
            sortedByImpact.sort((a, b) => b.pnlPercent - a.pnlPercent);
        } else if (sortBy === 'invested') {
            sortedByImpact.sort((a, b) => b.investedValue - a.investedValue);
        } else if (sortBy === 'dayChange') {
            sortedByImpact.sort((a, b) => b.dayChangePercent - a.dayChangePercent);
        } else if (sortBy === 'ltp') {
            // Just implied by dayChange really, but if they meant Absolute LTP? Assume Day Change % for "LTP change"
            sortedByImpact.sort((a, b) => b.dayChangePercent - a.dayChangePercent);
        }

        // Changed to Top 5
        // For "Invested", "Draggers" (Losers) doesn't make total sense as "Bottom 5 invested", but we can stick to the logic of "Bottom of the list"
        // But for Invested, usually you just want to see top holdings. 
        // Let's keep the split: Top 5 from top (Gainers/High) and Top 5 from bottom (Losers/Low)

        const topGainers = sortedByImpact.slice(0, 5);
        // For negative lists (Draggers), we usually want the bottom of the sorted list, reversed.
        // If sorting by P&L: Top is +100%, Bottom is -50%. slice(-5).reverse() gives -50%, -40%...
        const topLosers = sortedByImpact.slice(-5).reverse();

        // Special handling: If sorting by 'Invested', 'Top Losers' implies 'Lowest Invested'. 
        // If sorting by 'Impact' or 'P&L' or 'DayChange', it implies 'Worst Performers'.

        // Filter out positives for "Losers" ONLY IF we are sorting by performance metrics
        // User asked "Based on invested value". Showing "Lowest Invested" in the red box is technically correct by logic but might be weird. 
        // Let's accept strictly mathematical "Top 5" and "Bottom 5".

        return {
            totalValue,
            totalInvested,
            totalPnl,
            totalDayGL,
            totalDayGLPercent: (totalValue - totalDayGL) ? (totalDayGL / (totalValue - totalDayGL)) * 100 : 0,
            analyzedStocks,
            topGainers,
            topLosers
        };
    }, [holdings, credentials, livePrices, sortBy]);

    if (!credentials) {
        return <CredentialForm onSubmit={handleConnect} isLoading={isLoading} error={error} />;
    }

    if (!analysis) return <div className="p-8 text-center text-slate-400">Loading analysis...</div>;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        Daily Market Brief
                    </h1>
                    <p className="text-slate-500 text-sm">Portfolio Manager's Copilot</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-2 rounded-lg">
                    {/* Price Loading Indicator */}
                    {isPriceLoading && (
                        <div className="flex items-center gap-2 px-2 text-xs text-amber-500 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Updating Prices...
                        </div>
                    )}
                    <LastUpdated date={pfLastUpdated} isLoading={isLoading} />
                    <button
                        onClick={() => handleConnect(credentials)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                        title="Refresh Data"
                    >
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    </button>
                </div>
            </header>

            {/* Portfolio Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                    label="Portfolio Value"
                    value={`₹ ${analysis.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                    subValue={`Invested: ₹ ${analysis.totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                    icon={<DollarSign className="text-blue-400" />}
                />
                <Card
                    label="Total P&L"
                    value={`₹ ${analysis.totalPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                    subValue={`${analysis.totalInvested ? ((analysis.totalPnl / analysis.totalInvested) * 100).toFixed(2) : 0}% All time`}
                    isPositive={analysis.totalPnl >= 0}
                    icon={<TrendingUp className={analysis.totalPnl >= 0 ? "text-green-400" : "text-red-400"} />}
                />
                <Card
                    label="Today's Move"
                    value={`₹ ${Math.abs(analysis.totalDayGL).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                    subValue={`${analysis.totalDayGLPercent > 0 ? '+' : ''}${analysis.totalDayGLPercent.toFixed(2)}% Today`}
                    isPositive={analysis.totalDayGL >= 0}
                    icon={analysis.totalDayGL >= 0 ? <TrendingUp className="text-green-400" /> : <TrendingDown className="text-red-400" />}
                />
            </div>

            {/* Movers & Draggers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
                {/* Filter Controls */}
                <div className="lg:col-span-2 flex justify-end gap-2 text-sm bg-slate-900/30 p-2 rounded-lg">
                    <span className="text-slate-500 self-center mr-2">Sort by:</span>
                    <FilterButton active={sortBy === 'impact'} onClick={() => setSortBy('impact')} label="Portfolio Impact" />
                    <FilterButton active={sortBy === 'pnl'} onClick={() => setSortBy('pnl')} label="Overall P&L %" />
                    <FilterButton active={sortBy === 'dayChange'} onClick={() => setSortBy('dayChange')} label="Day Change %" />
                    <FilterButton active={sortBy === 'invested'} onClick={() => setSortBy('invested')} label="Invested Value" />
                </div>

                {/* Top Movers */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-green-400 flex items-center gap-2">
                            {sortBy === 'invested' ? 'Top Holdings' : 'Top Contributors'}
                        </h3>
                        {/* Removed duplicate LastUpdated to clean up UI, relying on header one or adding back if needed */}
                    </div>
                    <div className="space-y-4">
                        {analysis.topGainers.length > 0 ? (
                            analysis.topGainers.map(stock => (
                                <StockRow key={stock.symbol} stock={stock} type="gainer" sortBy={sortBy} />
                            ))
                        ) : (
                            <div className="text-slate-500 text-sm py-4">No stocks found.</div>
                        )}
                    </div>
                </div>

                {/* Top Draggers */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                            {sortBy === 'invested' ? 'Bottom Holdings' : 'Top Draggers'}
                        </h3>
                    </div>
                    <div className="space-y-4">
                        {analysis.topLosers.length > 0 ? (
                            analysis.topLosers.map(stock => (
                                <StockRow key={stock.symbol} stock={stock} type="loser" sortBy={sortBy} />
                            ))
                        ) : (
                            <div className="text-slate-500 text-sm py-4">No stocks found.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Advanced News Section */}
            <PortfolioNews
                news={newsData}
                lastUpdated={newsLastUpdated}
                isLoading={isNewsLoading}
                onRefresh={() => refetchNews(holdings)}
            />

        </div>
    );
};

// Sub-components
const FilterButton = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
    <button
        onClick={onClick}
        className={cn(
            "px-3 py-1 rounded-md transition-all border",
            active
                ? "bg-blue-500/20 text-blue-300 border-blue-500/50"
                : "bg-transparent text-slate-500 border-transparent hover:bg-slate-800 hover:text-slate-300"
        )}
    >
        {label}
    </button>
);

const Card = ({ label, value, subValue, icon, isPositive }: any) => (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 font-medium text-sm">{label}</span>
            <div className="p-2 bg-slate-950 rounded-lg">{icon}</div>
        </div>
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        {subValue && (
            <div className={cn("text-xs font-medium", isPositive === undefined ? "text-slate-500" : isPositive ? "text-green-500" : "text-red-500")}>
                {subValue}
            </div>
        )}
    </div>
);

const StockRow = ({ stock, type, sortBy }: { stock: StockAnalysis, type: 'gainer' | 'loser', sortBy: string }) => {
    // Dynamic Secondary Value based on Sort
    let primaryMetric = "";
    let secondaryMetric = "";

    if (sortBy === 'impact') {
        primaryMetric = `${stock.dayChangePercent > 0 ? '+' : ''}${stock.dayChangePercent.toFixed(2)}%`;
        secondaryMetric = `Impact: ${stock.portfolioImpact > 0 ? '+' : ''}₹${Math.floor(stock.portfolioImpact)}`;
    } else if (sortBy === 'pnl') {
        primaryMetric = `${stock.pnlPercent > 0 ? '+' : ''}${stock.pnlPercent.toFixed(2)}%`;
        secondaryMetric = `P&L: ₹${Math.floor(stock.pnl).toLocaleString()}`;
    } else if (sortBy === 'invested') {
        primaryMetric = `₹${Math.floor(stock.investedValue).toLocaleString()}`;
        secondaryMetric = `${stock.pnlPercent > 0 ? '+' : ''}${stock.pnlPercent.toFixed(2)}% P&L`;
    } else if (sortBy === 'dayChange') {
        primaryMetric = `${stock.dayChangePercent > 0 ? '+' : ''}${stock.dayChangePercent.toFixed(2)}%`;
        secondaryMetric = `LTP: ₹${(stock.currentValue / stock.quantity).toFixed(2)}`; // approx LTP
        // Actually we have currentValue = ltp * qty. So currentValue/qty is LTP. 
        // Better: we don't have LTP in StockAnalysis directly? 
        // We do: we have currentValue and quantity.
    }

    // Color logic: if logic is 'inverted' check type. 
    // Gainer = Top of list. Loser = Bottom of list.
    // Visuals: Green for gainers, Red for losers usually. 
    // But for "Invested", Top is just "High Value". Let's keep it neutral or blue?
    // Let's Stick to Green/Red for simplicity, or just White for Value.

    const isValueMetric = sortBy === 'invested';
    const valueColor = isValueMetric ? "text-slate-200" : (type === 'gainer' ? "text-green-400" : "text-red-400");

    return (
        <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800/50 hover:border-slate-700 transition-colors">
            <div>
                <div className="font-medium text-slate-200">{stock.symbol}</div>
                <div className="text-xs text-slate-500">{stock.quantity} qty • ₹{Math.floor(stock.currentValue).toLocaleString()}</div>
            </div>
            <div className="text-right">
                <div className={cn("font-bold", valueColor)}>
                    {primaryMetric}
                </div>
                <div className="text-xs text-slate-500">
                    {secondaryMetric}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
