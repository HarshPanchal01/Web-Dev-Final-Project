const express = require('express');
const router = express.Router();

router.get('/:country', async (req, res) => {
    try {
        // NewsData.io expects lowercase 2-letter country codes
        const country = req.params.country.toLowerCase();
        const apiKey = process.env.NEWS_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: 'NEWS_API_KEY is not configured on the server.' });
        }

        // Construct the NewsData.io API URL
        const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&country=${country}`;
        
        const response = await fetch(url);
        const data = await response.json();

        // Handle NewsData.io specific error responses
        if (data.status === 'error') {
            console.error("NewsData API Error:", data.results?.message);
            return res.status(400).json({ 
                error: 'Failed to fetch news from external API', 
                details: data.results?.message 
            });
        }

        // Format the response to send only necessary fields to the frontend
        const formattedNews = (data.results || []).map(article => ({
            title: article.title,
            summary: article.description || article.content || 'No summary available.',
            url: article.link,
            image: article.image_url || null
        }));

        res.json({ articles: formattedNews });

    } catch (error) {
        console.error('Error in /api/news/:country route:', error);
        res.status(500).json({ error: 'Internal server error while processing news request.' });
    }
});

module.exports = router;