export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url, headline, symbol, description } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    try {
        // 1. Attempt to Scrape Article
        let articleText = "";
        let sourceUsed = "snippet";

        try {
            const scrapeRes = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (scrapeRes.ok) {
                const html = await scrapeRes.text();
                // Basic Server-Side Extraction
                // Remove scripts, styles
                const cleanHtml = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
                    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, "");

                // Extract Paragraphs
                const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gm;
                let match;
                while ((match = pRegex.exec(cleanHtml)) !== null) {
                    const text = match[1].replace(/<[^>]*>/g, '').trim(); // Strip inner tags
                    if (text.length > 50) { // Filter out short nav items
                        articleText += text + "\n";
                    }
                }

                if (articleText.length > 200) {
                    sourceUsed = "full_article";
                }
            }
        } catch (e) {
            console.error("Scraping failed, falling back to snippet", e);
        }

        // 2. Construct Prompt
        const context = sourceUsed === 'full_article' ? articleText.slice(0, 10000) : description; // Limit context window

        const prompt = `You are a strict financial analyst. Read the following text about ${symbol}.
        
        Headline: ${headline}
        Content: ${context}

        Task:
        1. Summarize the KEY financial facts in bullet points (max 3).
        2. Analyze the specific impact on ${symbol} stock.
        3. Assign a Verdict: Bullish, Bearish, or Neutral.

        Format output exactly as JSON:
        {
            "summary": "...",
            "impact_analysis": "...",
            "verdict": "Bullish" | "Bearish" | "Neutral"
        }`;

        // 3. Call Gemini API
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const geminiData = await geminiRes.json();

        if (!geminiData.candidates || !geminiData.candidates[0]) {
            throw new Error("Gemini API returned no candidates");
        }

        const rawText = geminiData.candidates[0].content.parts[0].text;
        // Clean markdown code blocks if present
        const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(jsonStr);

        res.status(200).json({ ...analysis, source_used: sourceUsed });

    } catch (error: any) {
        console.error("Analysis Error:", error);
        res.status(500).json({ error: "Analysis failed", details: error.message });
    }
}
