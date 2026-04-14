const axios = require("axios");

// Simple sentiment keyword scoring
function analyzeSentiment(text) {
  if (!text) return "neutral";

  const positiveWords = ["good", "great", "positive", "growth", "success"];
  const negativeWords = ["bad", "crisis", "decline", "fail", "negative"];

  let score = 0;
  const lower = text.toLowerCase();

  positiveWords.forEach(word => {
    if (lower.includes(word)) score++;
  });

  negativeWords.forEach(word => {
    if (lower.includes(word)) score--;
  });

  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

async function fetchAndProcessNews(country, category) {
  try {
    const API_KEY = process.env.NEWS_API_KEY;

    const response = await axios.get("https://newsapi.org/v2/top-headlines", {
      params: {
        country,
        category,
        apiKey: API_KEY,
        pageSize: 20,
      },
    });

    const articles = response.data.articles || [];

    const processed = articles.map(article => {
      const sentiment = analyzeSentiment(
        article.title + " " + article.description
      );

      return {
        title: article.title,
        description: article.description,
        url: article.url,
        image: article.urlToImage,
        source: article.source.name,
        sentiment,
      };
    });

    // Aggregate sentiment
    const summary = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    processed.forEach(a => {
      summary[a.sentiment]++;
    });

    return {
      articles: processed,
      summary,
    };

  } catch (error) {
    console.error("News service error:", error);
    throw error;
  }
}

module.exports = {
  fetchAndProcessNews,
};
