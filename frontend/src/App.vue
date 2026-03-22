<script setup>
import { ref } from 'vue'
import WorldMap from './components/WorldMap.vue'

const selectedCountry = ref(null)
const articles = ref([])
const isLoading = ref(false)

const handleCountrySelection = async (countryId) => {
  console.log('Country selected:', countryId)
  selectedCountry.value = countryId
  isLoading.value = true
  articles.value = []
  
  try {
    const res = await fetch(`http://localhost:3000/api/news/${countryId}`)
    const data = await res.json()
    articles.value = data.articles || []
  } catch (err) {
    console.error("Failed to fetch news:", err)
  } finally {
    isLoading.value = false
  }
}

const getSentimentClass = (category) => {
  if (category === 'Positive') return 'positive-news';
  if (category === 'Negative') return 'negative-news';
  return 'neutral-news';
}

const getSentimentTagClass = (category) => {
  if (category === 'Positive') return 'is-success';
  if (category === 'Negative') return 'is-danger';
  return 'is-dark';
}
</script>

<template>
  <div class="dashboard">
    <!-- Left Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1 class="title is-5 has-text-white mb-0 title-text">World News Sentiment</h1>
      </div>
      <p class="menu-label px-4 mt-5 has-text-grey-light">LIVE INTELLIGENCE</p>
      <ul class="menu-list px-2 mt-2">
        <li><a class="is-active">Global View</a></li>
        <li><a>Trending</a></li>
        <li><a>Sentiment</a></li>
        <li><a>Archive</a></li>
      </ul>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Top Navbar (Categories) -->
      <nav class="top-nav">
        <div class="nav-links">
          <a href="#" class="is-active">Technology</a>
          <a href="#">Sports</a>
          <a href="#">Business</a>
          <a href="#">Finance</a>
          <a href="#">Health</a>
        </div>
      </nav>

      <!-- Dashboard Grid -->
      <div class="dashboard-grid">
        
        <!-- Top Stats (Dummy data to match design) -->
        <div class="stat-cards">
          <div class="stat-card positive">
            <p class="heading">GLOBAL SENTIMENT</p>
            <p class="title has-text-success">74% Positive</p>
          </div>
          <div class="stat-card negative">
            <p class="heading">ECONOMIC ALERT</p>
            <p class="title" style="color: #ff8e8b;">12% Negative</p>
          </div>
          <div class="stat-card neutral">
            <p class="heading">NEUTRAL VOLUME</p>
            <p class="title has-text-grey-light">14% Stable</p>
          </div>
          <div class="stat-card active">
            <p class="heading">ACTIVE STORIES</p>
            <p class="title has-text-primary">2.4k Items</p>
          </div>
        </div>

        <div class="content-split">
          <!-- Map Area -->
          <div class="map-area">
            <WorldMap @countrySelected="handleCountrySelection" />
          </div>

          <!-- Trending News Sidebar -->
          <div class="news-area box has-background-black-ter mb-0">
            <div class="news-header">
              <h3 class="title is-5 has-text-white mb-0">Trending Now</h3>
            </div>
            
            <div class="news-feed">
              <p v-if="!selectedCountry" class="has-text-grey is-size-6 mt-4">Select a country on the map to display its local news.</p>
              
              <div v-else-if="isLoading" class="has-text-centered mt-6">
                <div class="loader is-loading mx-auto mb-3" style="width: 3rem; height: 3rem; border-color: #48c774; border-right-color: transparent;"></div>
                <p class="has-text-primary has-text-weight-bold is-size-7">Fetching local news for {{ selectedCountry }}...</p>
              </div>

              <div v-else-if="articles.length === 0" class="has-text-centered mt-6">
                <p class="has-text-grey-light is-size-6">No recent news found for this country.</p>
              </div>

              <TransitionGroup name="list" tag="div" v-else>
                <a 
                  v-for="(article, index) in articles" 
                  :key="index"
                  :href="article.url" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="news-card-link"
                >
                  <div class="news-card" :class="getSentimentClass(article.sentimentCategory)">
                     <div class="news-meta mb-2">
                        <span class="has-text-grey-light">NEWS UPDATE</span>
                        <span class="tag is-light is-pulled-right is-small" :class="getSentimentTagClass(article.sentimentCategory)">
                          {{ article.sentimentCategory.toUpperCase() }}
                        </span>
                     </div>
                     <h4 class="title is-6 has-text-white mb-2">{{ article.title }}</h4>
                     <div v-if="article.image" class="card-image mb-2">
                        <figure class="image is-2by1">
                          <img :src="article.image" alt="Article image" style="object-fit: cover; border-radius: 4px;">
                        </figure>
                     </div>
                     <p class="has-text-grey-light is-size-7 line-clamp-3">{{ article.summary }}</p>
                  </div>
                </a>
              </TransitionGroup>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style>
/* Global Resets */
:root {
  --bg-dark: #0b1120;
  --bg-panel: #161e2e;
  --bg-panel-light: #1f2937;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --border-color: #2d3748;
}

html, body {
  margin: 0;
  padding: 0;
  background-color: var(--bg-dark);
  color: var(--text-main);
  height: 100vh;
  overflow: hidden; /* Prevent scrolling on the body! */
}

/* Layout */
.dashboard {
  display: flex;
  height: 100vh;
  width: 100vw;
}

/* Sidebar */
.sidebar {
  width: 280px;
  background-color: var(--bg-panel);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.title-text {
  text-align: center;
  line-height: 1.3;
  width: 100%;
}

.menu-list a {
  color: var(--text-muted);
  padding: 0.85em 1.5rem;
  border-radius: 0;
  display: flex;
  align-items: center;
  font-weight: 500;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.menu-list a:hover {
  background-color: rgba(255,255,255,0.05);
  color: var(--text-main);
}

.menu-list a.is-active {
  background-color: rgba(72, 199, 116, 0.1);
  color: #48c774;
  border-left: 3px solid #48c774;
}

/* Main Content Area */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-dark);
}

/* Top Navbar */
.top-nav {
  height: 70px;
  display: flex;
  align-items: center;
  padding: 0 2rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-dark);
  flex-shrink: 0;
}

.nav-links a {
  color: var(--text-muted);
  margin-right: 2rem;
  font-weight: 500;
  font-size: 0.95rem;
  transition: color 0.2s;
}

.nav-links a:hover, .nav-links a.is-active {
  color: var(--text-main);
}

/* Dashboard Grid */
.dashboard-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  gap: 1.5rem;
  overflow: hidden;
}

/* Top Stats */
.stat-cards {
  display: flex;
  gap: 1.5rem;
  flex-shrink: 0;
}

.stat-card {
  flex: 1;
  background-color: var(--bg-panel);
  border-radius: 8px;
  padding: 1.25rem;
  border-left: 4px solid var(--border-color);
}

.stat-card.positive { border-left-color: #48c774; }
.stat-card.negative { border-left-color: #ff8e8b; }
.stat-card.neutral { border-left-color: #6c757d; }
.stat-card.active { border-left-color: #00d1b2; }

.stat-card .heading {
  color: var(--text-muted);
  letter-spacing: 1.5px;
  font-size: 0.7rem;
  margin-bottom: 0.5rem;
}

.stat-card .title {
  font-size: 1.75rem;
  margin: 0;
  font-weight: 700;
}

/* Map and News Split */
.content-split {
  flex: 1;
  display: flex;
  gap: 1.5rem;
  min-height: 0; /* Crucial for inner scrolling to work */
}

.map-area {
  flex: 2;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Let map container shrink */
}

/* Override WorldMap.vue internal spacing so it fills the map-area entirely */
.map-area > .map-wrapper {
  height: 100%;
}

.news-area {
  flex: 1;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-width: 450px;
  border: 1px solid var(--border-color);
}

.news-header {
  padding: 1.25rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.news-feed {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  /* Custom Scrollbar for dark theme */
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
}

.news-feed::-webkit-scrollbar {
  width: 6px;
}
.news-feed::-webkit-scrollbar-thumb {
  background-color: var(--border-color);
  border-radius: 3px;
}

.news-card {
  background-color: var(--bg-panel-light);
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  border-left: 3px solid var(--border-color);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.news-card-link {
  display: block;
  text-decoration: none;
}

.news-card-link:hover .news-card {
  background-color: #2a3441;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.3);
}

.news-card.positive-news { border-left-color: #48c774; }
.news-card.negative-news { border-left-color: #ff8e8b; }
.news-card.neutral-news { border-left-color: #6c757d; }

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;  
  overflow: hidden;
}

/* Vue TransitionGroup Classes */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.news-meta {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>