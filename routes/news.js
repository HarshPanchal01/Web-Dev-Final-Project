const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { analyzeSentiment } = require('../utils/sentiment');

// Allowed categories per NewsData.io documentation
const ALLOWED_CATEGORIES = [
    'business', 'entertainment', 'environment', 'food', 'health', 
    'politics', 'science', 'sports', 'technology', 'top', 'tourism', 'world'
];

// Bulk sentiment endpoint for coloring the map
router.get('/summary', async (req, res) => {
    try {
        let category = req.query.category ? req.query.category.toLowerCase() : null;
        if (category && !ALLOWED_CATEGORIES.includes(category)) {
            return res.status(400).json({ error: 'Invalid category.' });
        }

        // To prevent hitting API rate limits for all 200+ countries, we use a generated mock summary.
        // In a real production app, this would query a database of cached recent news.
        const countries = ['US', 'CA', 'GB', 'AU', 'IN', 'FR', 'DE', 'JP', 'BR', 'ZA', 'RU', 'CN', 'IT', 'MX', 'KR', 'ES', 'ID', 'SA', 'TR', 'AR'];
        
        const summary = {};
        
        countries.forEach(country => {
            // Generate a random score between -5 and 5 to simulate sentiment
            // Seed it slightly with the country string length and category so it's deterministic but varies
            const seed = (country.charCodeAt(0) + (category ? category.length : 0)) % 3;
            let categoryStr = 'Neutral';
            if (seed === 0) categoryStr = 'Negative';
            if (seed === 1) categoryStr = 'Positive';
            
            summary[country] = categoryStr;
        });

        res.json({ sentiments: summary });
    } catch (error) {
        console.error('Error in /api/news/summary route:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/:country', async (req, res) => {
    try {
        const country = req.params.country.toLowerCase();
        let category = req.query.category ? req.query.category.toLowerCase() : null;

        // Validate category if provided
        if (category && !ALLOWED_CATEGORIES.includes(category)) {
            return res.status(400).json({ 
                error: `Invalid category. Allowed categories are: ${ALLOWED_CATEGORIES.join(', ')}` 
            });
        }

        // Check if we should use mock data
        if (process.env.USE_MOCK_DATA === 'true') {
            const categoryLog = category ? ` (Category: ${category})` : '';
            console.log(`Serving MOCK news data for ${country}${categoryLog}...`);
            const mockDataPath = path.join(__dirname, '../utils/mock-news.json');
            const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
            
            // Add sentiment to mock data
            const formattedMockData = mockData.map(article => {
                const textToAnalyze = `${article.title} ${article.summary}`;
                const sentimentResult = analyzeSentiment(textToAnalyze);
                return {
                    ...article,
                    sentimentScore: sentimentResult.score,
                    sentimentCategory: sentimentResult.category
                };
            });
            
            return res.json({ articles: formattedMockData });
        }

        const apiKey = process.env.NEWS_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: 'NEWS_API_KEY is not configured on the server.' });
        }

        // Construct the NewsData.io API URL
        let url = `https://newsdata.io/api/1/news?apikey=${apiKey}&country=${country}`;
        if (category) {
            url += `&category=${category}`;
        }
        
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

        // Format the response to send only necessary fields to the frontend and calculate sentiment
        const formattedNews = (data.results || []).map(article => {
            const title = article.title;
            const summary = article.description || article.content || 'No summary available.';
            const textToAnalyze = `${title} ${summary}`;
            const sentimentResult = analyzeSentiment(textToAnalyze);

            return {
                title: title,
                summary: summary,
                url: article.link,
                image: article.image_url || null,
                sentimentScore: sentimentResult.score,
                sentimentCategory: sentimentResult.category
            };
        });

        res.json({ articles: formattedNews });

    } catch (error) {
        console.error('Error in /api/news/:country route:', error);
        res.status(500).json({ error: 'Internal server error while processing news request.' });
    }
});

module.exports = router;