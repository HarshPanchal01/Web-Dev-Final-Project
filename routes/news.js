const express = require("express");
const router = express.Router();
const { fetchAndProcessNews } = require("../utils/newsService");

router.get("/", async (req, res) => {
  try {
    const { country, category } = req.query;

    // Basic validation
    if (!country) {
      return res.status(400).json({
        status: "error",
        message: "Country is required",
      });
    }

    const data = await fetchAndProcessNews(country, category);

    // Empty state
    if (!data.articles.length) {
      return res.status(200).json({
        status: "empty",
        message: "No articles found",
        data: data,
      });
    }

    res.json({
      status: "success",
      data: data,
    });

  } catch (error) {
    console.error("News route error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch news",
    });
  }
});

module.exports = router;
