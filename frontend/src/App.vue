<script setup>
import { computed, ref, watch } from 'vue'
import WorldMap from './components/WorldMap.vue'

const currentView = ref('Global View')
const darkMode = ref(true)
const selectedCountry = ref('')
const selectedCategory = ref('top')
const articles = ref([])
const archiveArticles = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

const categoryOptions = [
  { label: 'Top', value: 'top' },
  { label: 'World', value: 'world' },
  { label: 'Technology', value: 'technology' },
  { label: 'Business', value: 'business' },
  { label: 'Sports', value: 'sports' },
  { label: 'Health', value: 'health' },
  { label: 'Science', value: 'science' },
  { label: 'Politics', value: 'politics' },
  { label: 'Entertainment', value: 'entertainment' },
]

const regionNames =
  typeof Intl !== 'undefined' && Intl.DisplayNames
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null

const displayCountryName = computed(() => {
  if (!selectedCountry.value) return 'No country selected'
  const code = selectedCountry.value.toUpperCase()
  return regionNames?.of(code) || code
})

const positiveCount = computed(
  () =>
    articles.value.filter(
      (article) => article.sentimentCategory === 'Positive',
    ).length,
)

const negativeCount = computed(
  () =>
    articles.value.filter(
      (article) => article.sentimentCategory === 'Negative',
    ).length,
)

const neutralCount = computed(
  () =>
    articles.value.filter((article) => article.sentimentCategory === 'Neutral')
      .length,
)

const trendingArticles = computed(() => articles.value.slice(0, 8))
const latestArchive = computed(() => archiveArticles.value.slice(0, 12))

const sentimentBreakdown = computed(() => {
  const total = articles.value.length || 1

  return [
    {
      label: 'Positive',
      count: positiveCount.value,
      percent: Math.round((positiveCount.value / total) * 100),
      className: 'positive-pill',
    },
    {
      label: 'Negative',
      count: negativeCount.value,
      percent: Math.round((negativeCount.value / total) * 100),
      className: 'negative-pill',
    },
    {
      label: 'Neutral',
      count: neutralCount.value,
      percent: Math.round((neutralCount.value / total) * 100),
      className: 'neutral-pill',
    },
  ]
})

const toggleTheme = () => {
  darkMode.value = !darkMode.value
}

const getSentimentClass = (category) => {
  if (category === 'Positive') return 'positive-news'
  if (category === 'Negative') return 'negative-news'
  return 'neutral-news'
}

const getSentimentTagClass = (category) => {
  if (category === 'Positive') return 'is-success'
  if (category === 'Negative') return 'is-danger'
  return 'is-dark'
}

const addToArchive = (countryCode, nextArticles) => {
  const stampedArticles = nextArticles.map((article) => ({
    ...article,
    country: regionNames?.of(countryCode.toUpperCase()) || countryCode.toUpperCase(),
    countryCode: countryCode.toUpperCase(),
    category: selectedCategory.value,
    loadedAt: new Date().toISOString(),
  }))

  const existingUrls = new Set(archiveArticles.value.map((article) => article.url))
  const uniqueNewArticles = stampedArticles.filter(
    (article) => !existingUrls.has(article.url),
  )

  archiveArticles.value = [...uniqueNewArticles, ...archiveArticles.value].slice(
    0,
    40,
  )
}

const fetchArticles = async (countryCode = selectedCountry.value) => {
  if (!countryCode) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const params = new URLSearchParams()
    if (selectedCategory.value) {
      params.set('category', selectedCategory.value)
    }

    const url = `http://localhost:3000/api/news/${countryCode}?${params.toString()}`
    const response = await fetch(url)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load news articles.')
    }

    const nextArticles = data.articles || []
    articles.value = nextArticles
    addToArchive(countryCode, nextArticles)
  } catch (error) {
    articles.value = []
    errorMessage.value =
      error.message || 'Something went wrong while loading the feed.'
  } finally {
    isLoading.value = false
  }
}

const handleCountrySelection = async (countryId) => {
  selectedCountry.value = countryId
  currentView.value = 'Global View'
  await fetchArticles(countryId)
}

watch(selectedCategory, async () => {
  if (selectedCountry.value) {
    await fetchArticles(selectedCountry.value)
  }
})
</script>

<template>
  <div class="dashboard" :class="{ 'light-theme': !darkMode }">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div>
          <p class="eyebrow">WORLD NEWS</p>
          <h1 class="title is-5 has-text-white mb-0 title-text">
            Sentiment Dashboard
          </h1>
        </div>
      </div>

      <div class="theme-toggle-wrap">
        <button class="button is-small theme-toggle-btn" @click="toggleTheme">
          {{ darkMode ? 'Switch to Light' : 'Switch to Dark' }}
        </button>
      </div>

      <div class="status-card">
        <p class="menu-label mb-2">Active selection</p>
        <p class="status-country">{{ displayCountryName }}</p>
        <p class="status-meta">
          {{ articles.length }} article{{ articles.length === 1 ? '' : 's' }} ·
          {{ selectedCategory }}
        </p>
      </div>

      <p class="menu-label px-4 mt-5 has-text-grey-light">LIVE INTELLIGENCE</p>
      <ul class="menu-list px-2 mt-2">
        <li>
          <a
            :class="{ 'is-active': currentView === 'Global View' }"
            @click="currentView = 'Global View'"
          >
            Global View
          </a>
        </li>
        <li>
          <a
            :class="{ 'is-active': currentView === 'Trending' }"
            @click="currentView = 'Trending'"
          >
            Trending
          </a>
        </li>
        <li>
          <a
            :class="{ 'is-active': currentView === 'Sentiment' }"
            @click="currentView = 'Sentiment'"
          >
            Sentiment
          </a>
        </li>
        <li>
          <a
            :class="{ 'is-active': currentView === 'Archive' }"
            @click="currentView = 'Archive'"
          >
            Archive
          </a>
        </li>
      </ul>
    </aside>

    <main class="main-content">
      <nav class="top-nav">
        <div>
          <p class="top-nav-label">Main UI and feed</p>
          <h2 class="top-nav-title">{{ displayCountryName }}</h2>
        </div>

        <div class="top-nav-actions">
          <div
            v-if="currentView === 'Trending' || currentView === 'Global View'"
            class="select-wrap"
          >
            <label class="select-label">Category</label>
            <div class="select is-small is-dark">
              <select v-model="selectedCategory">
                <option
                  v-for="option in categoryOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>

          <button
            class="button is-small is-success is-light"
            :disabled="!selectedCountry || isLoading"
            @click="fetchArticles()"
          >
            Refresh feed
          </button>
        </div>
      </nav>

      <div v-if="currentView === 'Global View'" class="dashboard-grid">
        <div class="stat-cards">
          <div class="stat-card positive">
            <p class="heading">POSITIVE STORIES</p>
            <p class="title has-text-success">{{ positiveCount }}</p>
          </div>
          <div class="stat-card negative">
            <p class="heading">NEGATIVE STORIES</p>
            <p class="title danger-text">{{ negativeCount }}</p>
          </div>
          <div class="stat-card neutral">
            <p class="heading">NEUTRAL STORIES</p>
            <p class="title muted-text">{{ neutralCount }}</p>
          </div>
          <div class="stat-card active">
            <p class="heading">ARCHIVED ITEMS</p>
            <p class="title has-text-primary">{{ archiveArticles.length }}</p>
          </div>
        </div>

        <div class="content-split">
          <div class="map-area">
            <WorldMap
              :selectedCategory="selectedCategory"
              @countrySelected="handleCountrySelection"
            />
          </div>

          <div class="news-area box has-background-black-ter mb-0">
            <div class="news-header">
              <div>
                <h3 class="title is-5 has-text-white mb-1">Live Feed</h3>
                <p class="news-subtitle">
                  {{
                    selectedCountry
                      ? `Showing ${selectedCategory} news for ${displayCountryName}`
                      : 'Choose a country from the map to load the feed.'
                  }}
                </p>
              </div>
            </div>

            <div class="news-feed">
              <p v-if="!selectedCountry" class="empty-copy">
                Select a country on the map to display local headlines and
                sentiment.
              </p>

              <div v-else-if="isLoading" class="has-text-centered mt-6">
                <div class="loader is-loading mx-auto mb-3 loader-ring"></div>
                <p class="has-text-primary has-text-weight-bold is-size-7">
                  Fetching {{ selectedCategory }} headlines for
                  {{ displayCountryName }}...
                </p>
              </div>

              <div v-else-if="errorMessage" class="empty-box compact-box">
                {{ errorMessage }}
              </div>

              <div v-else-if="articles.length === 0" class="empty-box compact-box">
                No recent articles were returned for this selection.
              </div>

              <TransitionGroup v-else name="list" tag="div">
                <a
                  v-for="(article, index) in articles"
                  :key="`${article.url}-${index}`"
                  :href="article.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="news-card-link"
                >
                  <div
                    class="news-card"
                    :class="getSentimentClass(article.sentimentCategory)"
                  >
                    <div class="news-meta mb-2">
                      <span>{{ displayCountryName.toUpperCase() }}</span>
                      <span
                        class="tag is-light is-pulled-right is-small"
                        :class="getSentimentTagClass(article.sentimentCategory)"
                      >
                        {{ article.sentimentCategory.toUpperCase() }}
                      </span>
                    </div>

                    <h4 class="title is-6 has-text-white mb-2">
                      {{ article.title }}
                    </h4>

                    <div v-if="article.image" class="card-image mb-2">
                      <figure class="image is-2by1">
                        <img
                          :src="article.image"
                          alt="Article image"
                          class="article-image"
                        />
                      </figure>
                    </div>

                    <p class="has-text-grey-light is-size-7 line-clamp-3">
                      {{ article.summary }}
                    </p>
                  </div>
                </a>
              </TransitionGroup>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="currentView === 'Trending'" class="page-view">
        <div class="page-header-row">
          <div>
            <h2 class="page-title">Trending</h2>
            <p class="page-subtitle">
              Top headlines for {{ displayCountryName }} in
              {{ selectedCategory }}.
            </p>
          </div>

          <div class="page-controls">
            <div class="select is-small is-dark">
              <select v-model="selectedCategory">
                <option
                  v-for="option in categoryOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>

            <button
              class="button is-small is-success is-light"
              :disabled="!selectedCountry || isLoading"
              @click="fetchArticles()"
            >
              Refresh
            </button>
          </div>
        </div>

        <div v-if="!selectedCountry" class="empty-box">
          Open Global View, click a country, and the trending page will populate
          here.
        </div>

        <div v-else-if="isLoading" class="empty-box">Loading trending stories...</div>
        <div v-else-if="errorMessage" class="empty-box">{{ errorMessage }}</div>
        <div v-else-if="trendingArticles.length === 0" class="empty-box">
          No articles available for this category.
        </div>

        <div v-else class="simple-grid">
          <a
            v-for="(article, index) in trendingArticles"
            :key="`${article.url}-${index}`"
            :href="article.url"
            target="_blank"
            rel="noopener noreferrer"
            class="simple-card-link"
          >
            <div class="simple-card">
              <div class="simple-card-top">
                <p class="small-label">{{ displayCountryName }}</p>
                <span
                  class="tag is-light"
                  :class="getSentimentTagClass(article.sentimentCategory)"
                >
                  {{ article.sentimentCategory }}
                </span>
              </div>

              <h3 class="simple-card-title">{{ article.title }}</h3>
              <p class="simple-card-text">{{ article.summary }}</p>
            </div>
          </a>
        </div>
      </div>

      <div v-else-if="currentView === 'Sentiment'" class="page-view">
        <h2 class="page-title">Sentiment</h2>
        <p class="page-subtitle">Breakdown based on the currently loaded feed.</p>

        <div v-if="!selectedCountry" class="empty-box">
          Select a country in Global View to generate the sentiment summary.
        </div>

        <div v-else class="sentiment-grid">
          <div
            v-for="item in sentimentBreakdown"
            :key="item.label"
            class="sentiment-card"
          >
            <div class="sentiment-card-head">
              <span>{{ item.label }}</span>
              <span class="pill" :class="item.className">{{ item.percent }}%</span>
            </div>
            <p class="sentiment-value">{{ item.count }}</p>
            <p class="sentiment-note">Articles in the current feed.</p>
          </div>
        </div>
      </div>

      <div v-else-if="currentView === 'Archive'" class="page-view">
        <h2 class="page-title">Archive</h2>
        <p class="page-subtitle">Previously loaded stories from all map selections.</p>

        <div v-if="latestArchive.length === 0" class="empty-box">
          Your archive will fill up as you load countries from the Global View.
        </div>

        <div v-else class="simple-grid archive-grid">
          <div
            v-for="(article, index) in latestArchive"
            :key="`${article.url}-${index}`"
            class="simple-card archive-card"
          >
            <div class="simple-card-top">
              <p class="small-label">{{ article.country }}</p>
              <span
                class="tag is-light"
                :class="getSentimentTagClass(article.sentimentCategory)"
              >
                {{ article.sentimentCategory }}
              </span>
            </div>

            <h3 class="simple-card-title">{{ article.title }}</h3>
            <p class="simple-card-text">{{ article.summary }}</p>

            <a
              :href="article.url"
              target="_blank"
              rel="noopener noreferrer"
              class="archive-link"
            >
              Open article
            </a>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style>
:root {
  --bg-dark: #0b1120;
  --bg-panel: #161e2e;
  --bg-panel-light: #1f2937;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --border-color: #2d3748;
  --accent: #48c774;
}

.light-theme {
  --bg-dark: #f4f6f8;
  --bg-panel: #ffffff;
  --bg-panel-light: #eef2f7;
  --text-main: #1f2937;
  --text-muted: #6b7280;
  --border-color: #d1d5db;
}

html,
body,
#app {
  margin: 0;
  padding: 0;
  background-color: var(--bg-dark);
  color: var(--text-main);
  height: 100vh;
  overflow: hidden;
}

.dashboard {
  display: flex;
  height: 100vh;
  width: 100vw;
  background: var(--bg-dark);
}

.sidebar {
  width: 280px;
  background-color: var(--bg-panel);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.eyebrow {
  color: var(--accent);
  font-size: 0.72rem;
  letter-spacing: 0.14rem;
  font-weight: 700;
  margin-bottom: 0.4rem;
}

.title-text {
  text-align: center;
  line-height: 1.25;
  width: 100%;
  color: var(--text-main) !important;
  word-break: break-word;
}

.theme-toggle-wrap {
  padding: 0.75rem 1rem 0.5rem;
}

.theme-toggle-btn {
  width: 100%;
}

.status-card {
  margin: 0 1rem;
  padding: 1rem;
  border-radius: 12px;
  background: var(--bg-panel-light);
  border: 1px solid var(--border-color);
}

.status-country {
  color: var(--text-main);
  font-size: 1rem;
  font-weight: 700;
}

.status-meta {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-top: 0.4rem;
  text-transform: capitalize;
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
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text-main);
}

.menu-list a.is-active {
  background-color: rgba(72, 199, 116, 0.1);
  color: #48c774;
  border-left: 3px solid #48c774;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-dark);
}

.top-nav {
  min-height: 76px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-dark);
  gap: 1rem;
}

.top-nav-label {
  color: var(--text-muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08rem;
}

.top-nav-title {
  color: var(--text-main);
  font-size: 1.2rem;
  font-weight: 700;
}

.top-nav-actions,
.page-controls {
  display: flex;
  align-items: end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.select-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.select-label {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.dashboard-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  gap: 1.5rem;
  overflow: hidden;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  flex-shrink: 0;
}

.stat-card {
  background-color: var(--bg-panel);
  border-radius: 12px;
  padding: 1.1rem;
  border-left: 4px solid var(--border-color);
  border: 1px solid var(--border-color);
}

.stat-card.positive {
  border-left-color: #48c774;
}

.stat-card.negative {
  border-left-color: #f14668;
}

.stat-card.neutral {
  border-left-color: #64748b;
}

.stat-card.active {
  border-left-color: #3273dc;
}

.stat-card .heading {
  color: var(--text-muted);
  letter-spacing: 1.3px;
  font-size: 0.68rem;
  margin-bottom: 0.5rem;
}

.stat-card .title {
  font-size: 1.75rem;
  margin: 0;
  font-weight: 700;
}

.danger-text {
  color: #f14668;
}

.muted-text {
  color: var(--text-muted);
}

.content-split {
  flex: 1;
  display: flex;
  gap: 1.5rem;
  min-height: 0;
}

.map-area {
  flex: 2;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

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
  background-color: var(--bg-panel) !important;
}

.news-header {
  padding: 1.25rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.news-subtitle {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.news-feed {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
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

.empty-copy {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-top: 0.5rem;
}

.loader-ring {
  width: 3rem;
  height: 3rem;
  border-color: #48c774;
  border-right-color: transparent;
}

.news-card {
  background-color: var(--bg-panel-light);
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1rem;
  border-left: 3px solid var(--border-color);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.news-card-link,
.simple-card-link,
.archive-link {
  text-decoration: none;
}

.news-card-link:hover .news-card,
.simple-card-link:hover .simple-card {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
}

.news-card.positive-news {
  border-left-color: #48c774;
}

.news-card.negative-news {
  border-left-color: #f14668;
}

.news-card.neutral-news {
  border-left-color: #64748b;
}

.article-image {
  object-fit: cover;
  border-radius: 6px;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

.news-meta {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-muted);
}

.page-view {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.page-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-title {
  color: var(--text-main);
  margin-bottom: 0.3rem;
}

.page-subtitle,
.small-label,
.simple-card-text {
  color: var(--text-muted);
}

.empty-box {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-color);
  padding: 1rem;
  border-radius: 12px;
  margin-top: 1rem;
  color: var(--text-muted);
}

.compact-box {
  margin-top: 0;
}

.simple-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.simple-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
  height: 100%;
}

.simple-card-top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.6rem;
}

.simple-card-title {
  color: var(--text-main);
  margin: 0.35rem 0 0.5rem;
  font-size: 1rem;
}

.sentiment-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.sentiment-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
}

.sentiment-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-main);
  font-weight: 600;
}

.sentiment-value {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-main);
  margin-top: 0.75rem;
}

.sentiment-note {
  color: var(--text-muted);
  margin-top: 0.35rem;
  font-size: 0.9rem;
}

.pill {
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.positive-pill {
  background: rgba(72, 199, 116, 0.15);
  color: #48c774;
}

.negative-pill {
  background: rgba(241, 70, 104, 0.15);
  color: #f14668;
}

.neutral-pill {
  background: rgba(100, 116, 139, 0.18);
  color: #94a3b8;
}

.archive-grid {
  align-items: stretch;
}

.archive-card {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.archive-link {
  color: var(--accent);
  font-weight: 600;
  margin-top: auto;
}

@media (max-width: 1100px) {
  .stat-cards,
  .sentiment-grid,
  .simple-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-split {
    flex-direction: column;
  }

  .news-area {
    max-width: none;
  }
}

@media (max-width: 768px) {
  .dashboard {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
  }

  .sidebar {
    width: 100%;
  }

  .top-nav,
  .page-header-row {
    align-items: flex-start;
  }

  .stat-cards,
  .sentiment-grid,
  .simple-grid {
    grid-template-columns: 1fr;
  }
}
</style>