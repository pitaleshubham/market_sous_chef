import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS Handling
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-UserType, X-SourceID, X-ClientLocalIP, X-ClientPublicIP, X-MACAddress, X-PrivateKey'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { path } = req.query;

    if (!path) {
        res.status(400).json({ error: "Path parameter missing" });
        return;
    }

    // Reconstruct the target path
    // path can be a string or array of strings. 
    const targetPath = Array.isArray(path) ? path.join('/') : path;

    const targetUrl = `https://apiconnect.angelbroking.com/rest/${targetPath}`;

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-UserType': req.headers['x-usertype'] as string || 'USER',
                'X-SourceID': req.headers['x-sourceid'] as string || 'WEB',
                'X-ClientLocalIP': req.headers['x-clientlocalip'] as string || '127.0.0.1',
                'X-ClientPublicIP': req.headers['x-clientpublicip'] as string || '127.0.0.1',
                'X-MACAddress': req.headers['x-macaddress'] as string || 'mock-mac',
                'X-PrivateKey': req.headers['x-privatekey'] as string || '',
                'Authorization': req.headers['authorization'] as string || ''
            },
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error: any) {
        res.status(500).json({ error: "Proxy Request Failed", details: error.message });
    }
}
