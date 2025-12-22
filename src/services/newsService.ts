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
    try {
        const response = await fetch(`/api/news?q=${encodeURIComponent(symbol)}`);
        const data = await response.json();

        if (!data.articles) return [];

        return data.articles.map((article: any, index: number) => {
            // Very basic simulated sentiment based on keywords (since we don't have a real AI analyzer backend)
            const text = article.title.toLowerCase();
            let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
            if (text.includes('surge') || text.includes('jump') || text.includes('high') || text.includes('buy') || text.includes('profit')) sentiment = 'positive';
            if (text.includes('fall') || text.includes('drop') || text.includes('low') || text.includes('sell') || text.includes('loss') || text.includes('down')) sentiment = 'negative';

            return {
                id: `${symbol}-${index}-${Date.now()}`,
                symbol,
                headline: article.title,
                summary: "Click to read full coverage from " + article.source, // Real summary requires expensive scraping
                sentiment,
                source: article.source,
                timestamp: new Date(article.pubDate),
                url: article.link
            };
        });
    } catch (error) {
        console.error("News fetch failed", error);
        return [];
    }
};
