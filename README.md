# World News Sentiment Map

Welcome to the **World News Sentiment Map**, a web application built for the CSCI3230U final project. This interactive map displays real-time sentiment (positive, negative, neutral) of recent news from different countries. 

## Project Overview
*   **Frontend:** Vue.js (via Vite), D3.js (Map rendering), HTML/CSS with Bulma.
*   **Backend:** Node.js, Express.js.
*   **APIs:** Third-party News API, Sentiment Analysis logic.

## Project Structure
```text
├── index.js              # Entry point for the Express backend server
├── frontend/             # Vue.js frontend application (built with Vite)
│   ├── index.html        # Main HTML file for Vite
│   ├── src/              # Frontend source code (Vue components, D3 logic, CSS)
│   ├── public/           # Static assets (Images, SVG map, etc.)
│   └── package.json      # Frontend dependencies
├── routes/               # Express API route handlers
├── utils/                # Backend utility functions (e.g., Sentiment analysis)
├── middlewares/          # Express middlewares
└── package.json          # Backend dependencies and concurrently scripts
```

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation
1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/HarshPanchal01/Web-Dev-Final-Project.git
   ```
2. Navigate into the project directory and install backend dependencies:
   ```bash
   cd Web-Dev-Final-Project
   npm install
   ```
3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

### Running the Project locally
We use `concurrently` during development to run both the Express backend and the Vite frontend simultaneously.

To start both servers, run from the root directory:
```bash
npm run dev
```
- The Vite frontend will be available at `http://localhost:5173`.
- The Express backend API will be available at `http://localhost:3000`.
