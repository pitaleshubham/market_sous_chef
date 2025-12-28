export default async function handler(req: any, res: any) {
    const { q } = req.query;

    if (!q) {
        res.status(400).json({ error: "Query parameter 'q' is missing" });
        return;
    }

    try {
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q + " stock news india")}&hl=en-IN&gl=IN&ceid=IN:en`;
        const response = await fetch(rssUrl);
        const text = await response.text();

        // Simple Regex Parser to avoid external dependencies (fast-xml-parser etc)
        // RSS <item> structure: <title>, <link>, <pubDate>, <source>
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        while ((match = itemRegex.exec(text)) !== null) {
            const content = match[1];

            const titleMatch = content.match(/<title>(.*?)<\/title>/);
            const linkMatch = content.match(/<link>(.*?)<\/link>/);
            const dateMatch = content.match(/<pubDate>(.*?)<\/pubDate>/);
            const sourceMatch = content.match(/<source url=".*?">(.*?)<\/source>/);
            const descriptionMatch = content.match(/<description>([\s\S]*?)<\/description>/);

            let description = "";
            if (descriptionMatch) {
                let clean = descriptionMatch[1];

                // 1. Decode generic HTML entities for tags
                clean = clean.replace(/&lt;/g, '<').replace(/&gt;/g, '>');

                // 2. Remove HTML tags (including anchors, fonts, etc.)
                clean = clean.replace(/<[^>]*>?/gm, '');

                // 3. Decode remaining text entities
                clean = clean.replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'");

                description = clean;
            }

            if (titleMatch && linkMatch) {
                const pubDateStr = dateMatch ? dateMatch[1] : new Date().toISOString();
                const pubDate = new Date(pubDateStr);
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

                if (pubDate >= oneWeekAgo) {
                    items.push({
                        title: titleMatch[1].replace('<![CDATA[', '').replace(']]>', ''),
                        link: linkMatch[1],
                        pubDate: pubDate.toISOString(),
                        source: sourceMatch ? sourceMatch[1] : 'Google News',
                        description: description.trim() || ""
                    });
                }
            }
            if (items.length >= 5) break;
        }

        res.status(200).json({ articles: items });
    } catch (error: any) {
        res.status(500).json({ error: "Failed to fetch news", details: error.message });
    }
}
