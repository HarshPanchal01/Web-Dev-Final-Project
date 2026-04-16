const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { analyzeSentiment } = require('../utils/sentiment');

const ALLOWED_CATEGORIES = [
  'business',
  'entertainment',
  'environment',
  'food',
  'health',
  'politics',
  'science',
  'sports',
  'technology',
  'top',
  'tourism',
  'world',
];

const SUMMARY_COUNTRIES = [
  'US', 'CA', 'GB', 'AU', 'IN', 'FR', 'DE', 'JP', 'BR', 'ZA',
  'RU', 'CN', 'IT', 'MX', 'KR', 'ES', 'ID', 'SA', 'TR', 'AR',
];

const SUMMARY_CACHE_TTL_MS = 10 * 60 * 1000;
const SUMMARY_CONCURRENCY_LIMIT = 4;
const BATCH_DELAY_MS = 400;
const FETCH_TIMEOUT_MS = 8000;

const summaryCache = new Map();

function validateCategory(category) {
  if (!category) return null;

  const normalizedCategory = category.toLowerCase();
  if (!ALLOWED_CATEGORIES.includes(normalizedCategory)) {
    return {
      error: `Invalid category. Allowed categories are: ${ALLOWED_CATEGORIES.join(', ')}`,
    };
  }

  return { value: normalizedCategory };
}

function getMockArticles() {
  const mockDataPath = path.join(__dirname, '../utils/mock-news.json');
  return JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapScoreToCategory(score, articleCount = 0) {
  if (articleCount < 3) return 'InsufficientData';
  if (score > 1) return 'Positive';
  if (score < -1) return 'Negative';
  return 'Neutral';
}

function formatArticle(article) {
  const title = article.title || 'Untitled article';
  const summary =
    article.description ||
    article.content ||
    article.summary ||
    'No summary available.';

  const textToAnalyze = `${title} ${summary}`.trim();
  const sentimentResult = analyzeSentiment(textToAnalyze);

  return {
    title,
    summary,
    url: article.link || article.url || '#',
    image: article.image_url || article.image || null,
    sentimentScore: sentimentResult.score,
    sentimentCategory: sentimentResult.category,
  };
}

async function fetchNewsData(country, category) {
  const apiKey = process.env.NEWSDATA_API_KEY || process.env.NEWS_API_KEY;

  if (!apiKey) {
    throw new Error('NEWS_API_KEY or NEWSDATA_API_KEY is not configured on the server.');
  }

  const url = new URL('https://newsdata.io/api/1/news');
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('country', country.toLowerCase());
  url.searchParams.set('language', 'en');

  if (category) {
    url.searchParams.set('category', category);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    console.log(`[news] fetching live news for country=${country} category=${category || 'all'}`);

    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json();

    if (!response.ok || data.status === 'error') {
      throw new Error(
        data.results?.message ||
        data.message ||
        `Failed to fetch news from NewsData.io for ${country}.`
      );
    }

    return data.results || [];
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out for ${country}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildMockSummary(category) {
  const categoryOffset = category ? category.length : 0;
  const summaries = [];
  const sentiments = {};

  SUMMARY_COUNTRIES.forEach((countryCode) => {
    const seed =
      countryCode.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) +
      categoryOffset;

    const normalizedSeed = (seed % 7) - 3;
    const articleCount = Math.abs(seed % 6) + 2;
    const averageScore = Number((normalizedSeed * 0.8).toFixed(2));
    const sentimentCategory = mapScoreToCategory(averageScore, articleCount);

    sentiments[countryCode] = sentimentCategory;
    summaries.push({
      countryCode,
      sentimentCategory,
      averageScore,
      articleCount,
    });
  });

  return { summaries, sentiments };
}

async function buildLiveSummary(category) {
  const summaries = [];
  const sentiments = {};

  console.log(
    `[news] building live summary for ${SUMMARY_COUNTRIES.length} countries ` +
    `with concurrency limit ${SUMMARY_CONCURRENCY_LIMIT}`
  );

  for (let i = 0; i < SUMMARY_COUNTRIES.length; i += SUMMARY_CONCURRENCY_LIMIT) {
    const batch = SUMMARY_COUNTRIES.slice(i, i + SUMMARY_CONCURRENCY_LIMIT);

    console.log(`[news] processing batch: ${batch.join(', ')}`);

    const results = await Promise.allSettled(
      batch.map(async (countryCode) => {
        const rawArticles = await fetchNewsData(countryCode, category);
        const formattedArticles = rawArticles.slice(0, 8).map(formatArticle);

        const articleCount = formattedArticles.length;
        const averageScore = articleCount
          ? Number(
              (
                formattedArticles.reduce(
                  (sum, article) => sum + article.sentimentScore,
                  0
                ) / articleCount
              ).toFixed(2)
            )
          : 0;

        return {
          countryCode,
          sentimentCategory: mapScoreToCategory(averageScore, articleCount),
          averageScore,
          articleCount,
        };
      })
    );

    results.forEach((result, index) => {
      const countryCode = batch[index];

      if (result.status === 'fulfilled') {
        summaries.push(result.value);
        sentiments[countryCode] = result.value.sentimentCategory;
      } else {
        console.error(
          `Summary fetch failed for ${countryCode}:`,
          result.reason?.message || result.reason
        );

        const fallback = {
          countryCode,
          sentimentCategory: 'InsufficientData',
          averageScore: 0,
          articleCount: 0,
        };

        summaries.push(fallback);
        sentiments[countryCode] = fallback.sentimentCategory;
      }
    });

    const hasMoreBatches = i + SUMMARY_CONCURRENCY_LIMIT < SUMMARY_COUNTRIES.length;
    if (hasMoreBatches) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return { summaries, sentiments };
}

router.get('/summary', async (req, res) => {
  try {
    const validation = validateCategory(req.query.category);
    if (validation?.error) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    const category = validation?.value || null;
    const cacheKey = category || 'all';
    const cached = summaryCache.get(cacheKey);

    if (cached && Date.now() - cached.createdAt < SUMMARY_CACHE_TTL_MS) {
      console.log(`[news] returning cached summary for category=${cacheKey}`);

      return res.json({
        success: true,
        source: cached.source,
        cached: true,
        lastUpdated: new Date(cached.createdAt).toISOString(),
        sentiments: cached.sentiments,
        summaries: cached.summaries,
      });
    }

    const useMockData = process.env.USE_MOCK_DATA === 'true';

    console.log('[news] summary route hit', {
      category,
      useMockData,
      countryCount: SUMMARY_COUNTRIES.length,
    });

    const summaryResult = useMockData
      ? buildMockSummary(category)
      : await buildLiveSummary(category);

    const source = useMockData ? 'mock' : 'live';

    summaryCache.set(cacheKey, {
      ...summaryResult,
      source,
      createdAt: Date.now(),
    });

    return res.json({
      success: true,
      source,
      cached: false,
      lastUpdated: new Date().toISOString(),
      sentiments: summaryResult.sentiments,
      summaries: summaryResult.summaries,
    });
  } catch (error) {
    console.error('Error in /api/news/summary route:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error while building the sentiment summary.',
      details: error.message,
    });
  }
});

router.get('/:country', async (req, res) => {
  try {
    const country = req.params.country.toLowerCase();
    const validation = validateCategory(req.query.category);

    if (validation?.error) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    const category = validation?.value || null;
    const useMockData = process.env.USE_MOCK_DATA === 'true';

    if (useMockData) {
      const mockArticles = getMockArticles().map(formatArticle);

      return res.json({
        success: true,
        source: 'mock',
        articles: mockArticles,
        articleCount: mockArticles.length,
      });
    }

    const rawArticles = await fetchNewsData(country, category);
    const formattedNews = rawArticles.map(formatArticle);

    return res.json({
      success: true,
      source: 'live',
      articles: formattedNews,
      articleCount: formattedNews.length,
    });
  } catch (error) {
    console.error('Error in /api/news/:country route:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error while processing news request.',
      details: error.message,
    });
  }
});

module.exports = router;