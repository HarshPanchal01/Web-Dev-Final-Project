require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const newsRoutes = require('./routes/news');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/news', newsRoutes);

// Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Basic route to test the API
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'API is running' });
});

// Fallback route for development if frontend/dist doesn't exist yet
app.get('/', (req, res) => {
    res.send('<h2>Backend API Server is running!</h2><p>For the frontend UI, please navigate to port 5173 (http://localhost:5173)</p>');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
