const Sentiment = require('sentiment');
const sentiment = new Sentiment();

/**
 * Analyzes the text and returns a sentiment score and category.
 * @param {string} text - The text to analyze (e.g., article title + summary)
 * @returns {object} { score: number, category: string }
 */
function analyzeSentiment(text) {
    if (!text) {
        return { score: 0, category: 'Neutral' };
    }

    const result = sentiment.analyze(text);
    const score = result.score;
    
    let category = 'Neutral';
    if (score > 1) {
        category = 'Positive';
    } else if (score < -1) {
        category = 'Negative';
    }

    return { score, category };
}

module.exports = { analyzeSentiment };