const fs = require("fs");
const path = require("path");
const { analyzeSentiment } = require("./sentiment");

// Countries used for global D3 map coloring
const SUMMARY_COUNTRIES = [
  "us",
  "ca",
  "gb",
  "au",
  "in",
  "fr",
  "de",
  "jp",
  "br",
  "za",
  "ru",
  "cn",
  "it",
  "mx",
  "kr",
  "es",
  "id",
  "sa",
  "tr",
  "ar",
];

function normalizeArticle(article) {
  const title = article.title || "Untitled";
  const summary =
    article.description || article.content || article.summary || "No summary available.";

  const textToAnalyze = `${title} ${summary}`;
  const sentimentResult = analyzeSentiment(textToAnalyze);

  return {
    title,
    summary,
    url: article.link || article.url || "#",
    image: article.image_url || article.urlToImage || article.image || null,
    sentimentScore: sentimentResult.score,
    sentimentCategory: sentimentResult.category,
  };
}

function summarizeArticles(articles) {
  const counts = {
    Positive: 0,
    Negative: 0,
    Neutral: 0,
  };

  articles.forEach((article) => {
    if (counts[article.sentimentCategory] !== undefined) {
      counts[article.sentimentCategory]++;
    }
  });

  return counts;
}

function getOverallSentiment(summary) {
  const { Positive, Negative, Neutral } = summary;

  if (Positive > Negative && Positive >= Neutral) return "Positive";
  if (Negative > Positive && Negative >= Neutral) return "Negative";
  return "Neutral";
}

async function fetchNewsForCountry(country, category = null) {
  // Mock mode for demos / missing API quota
  if (process.env.USE_MOCK_DATA === "true") {
    const mockDataPath = path.join(__dirname, "./mock-news.json");
    const mockData = JSON.parse(fs.readFileSync(mockDataPath, "utf8"));

    const articles = mockData.map(normalizeArticle);
    const summary = summarizeArticles(articles);

    return {
      country,
      category,
      articles,
      summary,
    };
  }

  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    throw new Error("NEWS_API_KEY is not configured on the server.");
  }

  let url = `https://newsdata.io/api/1/news?apikey=${apiKey}&country=${country}`;
  if (category) {
    url += `&category=${category}`;
  }

  const response = await fetch(url);
  const data = await response.json();

  if (data.status === "error") {
    throw new Error(data.results?.message || "External API request failed.");
  }

  const articles = (data.results || []).map(normalizeArticle);
  const summary = summarizeArticles(articles);

  return {
    country,
    category,
    articles,
    summary,
  };
}

// Used by /api/news/summary for D3 map binding
async function fetchSummary(category = null) {
  const sentiments = {};

  await Promise.all(
    SUMMARY_COUNTRIES.map(async (country) => {
      try {
        const result = await fetchNewsForCountry(country, category);
        sentiments[country] = getOverallSentiment(result.summary);
      } catch (error) {
        console.error(`Failed to fetch summary for ${country}:`, error.message);
        sentiments[country] = "NoData";
      }
    })
  );

  return { sentiments };
}

module.exports = {
  fetchNewsForCountry,
  fetchSummary,
};