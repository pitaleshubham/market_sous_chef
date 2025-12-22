import { PortfolioHolding, Position } from './types';
import { AngelCredentials } from './types'; // Assuming credentials interface is mostly same, need to update it in types.ts or here

export type { AngelCredentials } from './types';
export type { PortfolioHolding, Position, StockAnalysis, NewsItem } from './types';

// Helper to get local IP if available, but for now we rely on strict proxy path
const PROXY_BASE = ''; // The proxy is at root relative path '/rest'

export const authenticate = async (creds: AngelCredentials): Promise<string> => {
    const loginResponse = await fetch(`${PROXY_BASE}/rest/auth/angelbroking/user/v1/loginByPassword`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserType': 'USER',
            'X-SourceID': 'WEB',
            'X-ClientLocalIP': '127.0.0.1',
            'X-ClientPublicIP': '127.0.0.1',
            'X-MACAddress': 'mock-mac',
            'X-PrivateKey': creds.apiKey
        },
        body: JSON.stringify({
            clientcode: creds.clientCode,
            password: creds.password,
            totp: creds.totp
        })
    });

    const responseText = await loginResponse.text();
    let loginData;
    try {
        loginData = JSON.parse(responseText);
    } catch (e) {
        console.error("Login parsing failed. Response preview:", responseText.substring(0, 200));
        throw new Error("Connection Error: The server returned HTML instead of data. This usually means the Proxy is not working.");
    }

    if (!loginData.status || !loginData.data?.jwtToken) {
        throw new Error(loginData.message || "Invalid Credentials or API Error");
    }

    return loginData.data.jwtToken;
};

export const fetchHoldings = async (token: string, apiKey: string): Promise<PortfolioHolding[]> => {
    const holdingsResponse = await fetch(`${PROXY_BASE}/rest/secure/angelbroking/portfolio/v1/getHolding`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserType': 'USER',
            'X-SourceID': 'WEB',
            'X-ClientLocalIP': '127.0.0.1',
            'X-ClientPublicIP': '127.0.0.1',
            'X-MACAddress': 'mock-mac',
            'X-PrivateKey': apiKey
        }
    });

    const holdingsData = await holdingsResponse.json();

    if (!holdingsData.status) {
        throw new Error(holdingsData.message || "Failed to fetch holdings");
    }

    return holdingsData.data || [];
};

export const getLivePrices = async (token: string, apiKey: string, holdings: PortfolioHolding[]): Promise<Record<string, { ltp: number, close: number }>> => {
    const results: Record<string, { ltp: number, close: number }> = {};

    // Fetch in parallel (Angel API rate limits apply, but for typical portfolios < 50 this is okay-ish. 
    // Ideally we'd batch, but getLtpData is single. We'll utilize browser concurrency.)
    // Note: If too many requests, we should batch or sequence.

    await Promise.all(holdings.map(async (h) => {
        try {
            const response = await fetch(`${PROXY_BASE}/rest/secure/angelbroking/order/v1/getLtpData`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-UserType': 'USER',
                    'X-SourceID': 'WEB',
                    'X-ClientLocalIP': '127.0.0.1',
                    'X-ClientPublicIP': '127.0.0.1',
                    'X-MACAddress': 'mock-mac',
                    'X-PrivateKey': apiKey
                },
                body: JSON.stringify({
                    exchange: h.exchange,
                    tradingsymbol: h.tradingsymbol,
                    symboltoken: h.symboltoken
                })
            });
            const data = await response.json();
            if (data.status && data.data) {
                // getLtpData returns: open, high, low, close, ltp
                results[h.tradingsymbol] = {
                    ltp: parseFloat(data.data.ltp),
                    close: parseFloat(data.data.close)
                };
            }
        } catch (e) {
            console.error(`Failed to fetch price for ${h.tradingsymbol}`, e);
        }
    }));

    return results;
};

export const fetchPositions = async (creds: AngelCredentials): Promise<Position[]> => {
    // Placeholder for positions if needed later
    return [];
};
