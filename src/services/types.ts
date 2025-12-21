export interface PortfolioHolding {
    tradingsymbol: string;
    symboltoken: string;
    quantity: number;
    averageprice: number;
    ltp: number; // Last Traded Price
    product: string;
    exchange: string;
}

export interface Position {
    tradingsymbol: string;
    buyqty: string;
    sellqty: string;
    netqty: string;
    ltp: string;
}

export interface StockAnalysis {
    symbol: string;
    quantity: number;
    currentValue: number;
    investedValue: number;
    pnl: number;
    pnlPercent: number;
    dayChangePercent: number; // Mocked for now
    portfolioImpact: number; // Contribution
    news?: NewsItem[];
}

export interface NewsItem {
    id: string;
    symbol: string;
    headline: string;
    summary: string; // AI Generated Summary
    sentiment: 'positive' | 'negative' | 'neutral';
    source: string;
    timestamp: Date;
    url: string;
}

export interface AngelCredentials {
    apiKey: string;
    clientCode: string;
    password: string;
    totp: string;
}
