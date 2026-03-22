<script setup>
import { ref } from 'vue'
import WorldMap from './components/WorldMap.vue'

const selectedCountry = ref(null)

const handleCountrySelection = (countryId) => {
  console.log('Country selected:', countryId)
  selectedCountry.value = countryId
  // In the next task, we will fetch news using this ID!
}
</script>

<template>
  <div class="app-container">
    <!-- Navigation Bar -->
    <nav class="navbar is-primary" role="navigation" aria-label="main navigation">
      <div class="navbar-brand">
        <a class="navbar-item" href="/">
          <h1 class="title is-4 has-text-white mb-0">World News Sentiment Map</h1>
        </a>
      </div>
    </nav>

    <!-- Main Content -->
    <section class="section pt-4">
      <div class="container is-fluid px-5">
        
        <div class="columns is-desktop is-variable is-6">
          
          <!-- Map Section -->
          <div class="column is-8-desktop is-12-tablet">
            <div class="has-text-centered mb-4">
              <h2 class="title is-2 has-text-grey-dark mb-2">Global Sentiment</h2>
              <p class="subtitle is-5 has-text-grey">Click on a country to view trending news.</p>
            </div>
            
            <WorldMap @countrySelected="handleCountrySelection" />
          </div>

          <!-- News Feed Sidebar Placeholder -->
          <div class="column is-4-desktop is-12-tablet mt-6">
            <div class="box has-background-black-bis has-text-white trending-news-box">
              <h3 class="title is-4 has-text-white has-text-centered">Trending News</h3>
              <p v-if="!selectedCountry" class="has-text-grey-light has-text-centered">Select a country on the map to display news articles here.</p>
              <p v-else class="has-text-primary has-text-weight-bold has-text-centered">Fetching news for: {{ selectedCountry }}...</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  </div>
</template>

<style>
/* Global resets or overrides if needed */
html, body {
  background-color: #f0f2f5;
  height: 100%;
}

.app-container {
  min-height: 100vh;
}

.trending-news-box {
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  min-height: 200px;
}
</style>
