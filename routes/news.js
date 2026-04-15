const express = require("express");
const router = express.Router();
const { fetchNewsForCountry, fetchSummary } = require("../utils/newsService");

// Allowed categories
const ALLOWED_CATEGORIES = [
  "business",
  "entertainment",
  "environment",
  "food",
  "health",
  "politics",
  "science",
  "sports",
  "technology",
  "top",
  "tourism",
  "world",
];

// GET /api/news/summary
router.get("/summary", async (req, res) => {
  try {
    let category = req.query.category ? req.query.category.toLowerCase() : null;

    if (category && !ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "Invalid category." });
    }

    const data = await fetchSummary(category);
    return res.json(data);
  } catch (error) {
    console.error("Error in /api/news/summary route:", error);
    return res.status(500).json({
      error: "Internal server error while building sentiment summary.",
    });
  }
});

// GET /api/news/:country
router.get("/:country", async (req, res) => {
  try {
    const country = req.params.country.toLowerCase();
    let category = req.query.category ? req.query.category.toLowerCase() : null;

    if (category && !ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: `Invalid category. Allowed categories are: ${ALLOWED_CATEGORIES.join(", ")}`,
      });
    }

    const result = await fetchNewsForCountry(country, category);
    return res.json({ articles: result.articles });
  } catch (error) {
    console.error("Error in /api/news/:country route:", error);
    return res.status(500).json({
      error: "Internal server error while processing news request.",
    });
  }
});

module.exports = router;