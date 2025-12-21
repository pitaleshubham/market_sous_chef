import { PortfolioHolding, Position } from './types';
import { AngelCredentials } from './types'; // Assuming credentials interface is mostly same, need to update it in types.ts or here

export type { AngelCredentials } from './types';
export type { PortfolioHolding, Position, StockAnalysis, NewsItem } from './types';

// Helper to get local IP if available, but for now we rely on strict proxy path
const PROXY_BASE = ''; // The proxy is at root relative path '/rest'

export const fetchHoldings = async (creds: AngelCredentials): Promise<PortfolioHolding[]> => {
    // 1. Authenticate
    const loginResponse = await fetch(`${PROXY_BASE}/rest/auth/angelbroking/user/v1/loginByPassword`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserType': 'USER',
            'X-SourceID': 'WEB',
            'X-ClientLocalIP': '127.0.0.1', // Mock IP
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

    const loginData = await loginResponse.json().catch(async (e) => {
        const text = await loginResponse.text();
        console.error("Login parsing failed. Response preview:", text.substring(0, 200));
        throw new Error("Connection Error: The server returned HTML instead of data. This usually means the Proxy is not working.");
    });

    if (!loginData.status || !loginData.data?.jwtToken) {
        throw new Error(loginData.message || "Invalid Credentials or API Error");
    }

    const jwtToken = loginData.data.jwtToken;

    // 2. Fetch Holdings
    const holdingsResponse = await fetch(`${PROXY_BASE}/rest/secure/angelbroking/portfolio/v1/getHolding`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserType': 'USER',
            'X-SourceID': 'WEB',
            'X-ClientLocalIP': '127.0.0.1',
            'X-ClientPublicIP': '127.0.0.1',
            'X-MACAddress': 'mock-mac',
            'X-PrivateKey': creds.apiKey
        }
    });

    const holdingsData = await holdingsResponse.json();

    if (!holdingsData.status) {
        throw new Error(holdingsData.message || "Failed to fetch holdings");
    }

    return holdingsData.data || [];
};

export const fetchPositions = async (creds: AngelCredentials): Promise<Position[]> => {
    // Placeholder for positions if needed later
    return [];
};
