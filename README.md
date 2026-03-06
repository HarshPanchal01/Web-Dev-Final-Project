# World News Sentiment Map

Welcome to the **World News Sentiment Map**, a web application built for the CSCI3230U final project. This interactive map displays real-time sentiment (positive, negative, neutral) of recent news from different countries. 

## Project Overview
*   **Frontend:** Vue.js (via CDN), D3.js (Map rendering), HTML/CSS with Bulma.
*   **Backend:** Node.js, Express.js.
*   **APIs:** Third-party News API, Sentiment Analysis logic.

## Project Structure
```text
├── index.js              # Entry point for the Express backend server
├── public/               # Frontend files served to the browser
│   ├── index.html        # Main HTML file
│   ├── css/              # Custom stylesheets
│   ├── js/               # Frontend JavaScript (Vue logic, D3 scripts)
│   ├── assets/           # Images, SVG map, etc.
│   └── data/             # Static/Mock JSON data files
├── routes/               # Express API route handlers
├── utils/                # Backend utility functions (e.g., Sentiment analysis)
└── package.json          # Node dependencies and project scripts
```

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation
1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/HarshPanchal01/Web-Dev-Final-Project.git
   ```
2. Navigate into the project directory:
   ```bash
   cd Web-Dev-Final-Project
   ```
3. Install the required Node.js dependencies:
   ```bash
   npm install
   ```

### Running the Project locally
We use `nodemon` during development to automatically restart the server when files change.

To start the server, run:
```bash
npm run dev
```
Then, open your browser and go to `http://localhost:3000` to see the application.
