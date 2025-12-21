import { NewsItem } from "./types";

// Simulated "AI" Summaries for demo
const SUMMARIES = {
    positive: [
        "Company reported strong Q3 earnings, beating analyst estimates by 15%. Revenue growth was driven by higher demand in key segments.",
        "Strategic partnership announced with global leader, expected to boost annual revenue by $500M over the next 3 years.",
        "New product launch received overwhelming response, with pre-orders crossing 100k units in the first 24 hours."
    ],
    negative: [
        "Regulatory body issued a warning regarding compliance issues in the northern plant. Stock fell 3% on the news.",
        "Quarterly results missed expectations due to rising input costs and supply chain disruptions. Margins contracted by 200 bps.",
        "CEO announced surprise resignation citing personal reasons. Uncertainty over leadership transition weighs on the stock."
    ],
    neutral: [
        "Company announced dates for the upcoming AGM. No major agenda items expected apart from routine dividend approval.",
        "Sector outlook remains stable despite global macro headwinds. Analysts maintain a 'Hold' rating.",
        "Minor stake sale by promoter group (0.5%) to comply with minimum public shareholding norms. Market reaction muted."
    ]
};

const SOURCES = ["Economic Times", "Moneycontrol", "LiveMint", "CNBC-TV18", "Bloomberg Quint"];

export const fetchStockNews = async (symbol: string): Promise<NewsItem[]> => {
    // Simulate API Latency
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));

    // Deterministic random to give stable "Demo" news for specific stocks
    const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hasNews = seed % 3 !== 0; // 2/3rds of stocks have news

    if (!hasNews) return [];

    const numItems = 1 + (seed % 2); // 1 or 2 items
    const newsItems: NewsItem[] = [];

    for (let i = 0; i < numItems; i++) {
        const sentimentVal = (seed + i) % 3; // 0=pos, 1=neg, 2=neu
        const sentiment: 'positive' | 'negative' | 'neutral' =
            sentimentVal === 0 ? 'positive' : sentimentVal === 1 ? 'negative' : 'neutral';

        const summaryTemplates = SUMMARIES[sentiment];
        const summary = summaryTemplates[(seed + i) % summaryTemplates.length];

        const source = SOURCES[(seed + i) % SOURCES.length];

        // Random time within last 24 hours
        const timeAgo = Math.floor(Math.random() * 24 * 60 * 60 * 1000);
        const timestamp = new Date(Date.now() - timeAgo);

        newsItems.push({
            id: `${symbol}-${i}-${Date.now()}`,
            symbol,
            headline: `${symbol}: ${summary.split('.')[0]}...`,
            summary,
            sentiment,
            source,
            timestamp,
            url: `https://www.google.com/search?q=${symbol}+news`
        });
    }

    return newsItems;
};
