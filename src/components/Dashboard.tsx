import React, { useState, useEffect, useMemo } from 'react';
import { fetchHoldings, AngelCredentials, PortfolioHolding, StockAnalysis, NewsItem } from '../services/angelService';
import CredentialForm from './CredentialForm';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { cn } from '../utils/cn';
import { fetchStockNews } from '../services/newsService';
import PortfolioNews from './PortfolioNews';
import LastUpdated from './LastUpdated';

const Dashboard: React.FC = () => {
    const [credentials, setCredentials] = useState<AngelCredentials | null>(null);
    const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isNewsLoading, setIsNewsLoading] = useState(false);
    const [newsData, setNewsData] = useState<NewsItem[]>([]);
    const [error, setError] = useState<string | undefined>();

    // Timestamps
    const [pfLastUpdated, setPfLastUpdated] = useState<Date | null>(null);
    const [newsLastUpdated, setNewsLastUpdated] = useState<Date | null>(null);

    const handleConnect = async (creds: AngelCredentials) => {
        setIsLoading(true);
        setError(undefined);
        try {
            const data = await fetchHoldings(creds);
            setHoldings(data);
            setCredentials(creds);
            setPfLastUpdated(new Date());

            // Trigger News Fetch
            refetchNews(data);
        } catch (err) {
            setError("Failed to fetch portfolio. Check credentials.");
        } finally {
            setIsLoading(false);
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
        if (!holdings.length) return null;

        let totalValue = 0;
        let totalInvested = 0;
        let totalDayGL = 0;

        const analyzedStocks: StockAnalysis[] = holdings.map(h => {
            const mockDayChangePct = (h.tradingsymbol.length % 5) - 2.5;
            const currentValue = h.quantity * h.ltp;
            const investedValue = h.quantity * h.averageprice;

            totalValue += currentValue;
            totalInvested += investedValue;

            const prevClose = h.ltp / (1 + mockDayChangePct / 100);
            const dayGL = (h.ltp - prevClose) * h.quantity;
            totalDayGL += dayGL;

            return {
                symbol: h.tradingsymbol,
                quantity: h.quantity,
                currentValue,
                investedValue,
                pnl: currentValue - investedValue,
                pnlPercent: ((currentValue - investedValue) / investedValue) * 100,
                dayChangePercent: mockDayChangePct,
                portfolioImpact: dayGL,
                // We don't attach news here anymore, handled separately
            };
        });

        const totalPnl = totalValue - totalInvested;

        const sortedByImpact = [...analyzedStocks].sort((a, b) => b.portfolioImpact - a.portfolioImpact);
        // Changed to Top 5
        const topGainers = sortedByImpact.filter(s => s.portfolioImpact > 0).slice(0, 5);
        const topLosers = sortedByImpact.filter(s => s.portfolioImpact < 0).reverse().slice(0, 5);

        return {
            totalValue,
            totalInvested,
            totalPnl,
            totalDayGL,
            totalDayGLPercent: (totalDayGL / (totalValue - totalDayGL)) * 100,
            analyzedStocks,
            topGainers,
            topLosers
        };
    }, [holdings, credentials]);

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
                    subValue={`${((analysis.totalPnl / analysis.totalInvested) * 100).toFixed(2)}% All time`}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Movers */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-green-400 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" /> Top Contributors
                        </h3>
                        <LastUpdated date={pfLastUpdated} isLoading={isLoading} className="text-[10px]" />
                    </div>
                    <div className="space-y-4">
                        {analysis.topGainers.length > 0 ? (
                            analysis.topGainers.map(stock => (
                                <StockRow key={stock.symbol} stock={stock} type="gainer" />
                            ))
                        ) : (
                            <div className="text-slate-500 text-sm py-4">No significant gainers today.</div>
                        )}
                    </div>
                </div>

                {/* Top Draggers */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                            <TrendingDown className="w-5 h-5" /> Top Draggers
                        </h3>
                        <LastUpdated date={pfLastUpdated} isLoading={isLoading} className="text-[10px]" />
                    </div>
                    <div className="space-y-4">
                        {analysis.topLosers.length > 0 ? (
                            analysis.topLosers.map(stock => (
                                <StockRow key={stock.symbol} stock={stock} type="loser" />
                            ))
                        ) : (
                            <div className="text-slate-500 text-sm py-4">No significant losers today.</div>
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

const StockRow = ({ stock, type }: { stock: StockAnalysis, type: 'gainer' | 'loser' }) => (
    <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800/50 hover:border-slate-700 transition-colors">
        <div>
            <div className="font-medium text-slate-200">{stock.symbol}</div>
            <div className="text-xs text-slate-500">{stock.quantity} qty • ₹{stock.currentValue.toLocaleString()}</div>
        </div>
        <div className="text-right">
            <div className={cn("font-bold", type === 'gainer' ? "text-green-400" : "text-red-400")}>
                {stock.dayChangePercent > 0 ? '+' : ''}{stock.dayChangePercent.toFixed(2)}%
            </div>
            <div className={cn("text-xs", type === 'gainer' ? "text-green-500/70" : "text-red-500/70")}>
                Impact: {stock.portfolioImpact > 0 ? '+' : ''}₹{Math.floor(stock.portfolioImpact)}
            </div>
        </div>
    </div>
);

export default Dashboard;
