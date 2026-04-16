<script setup>
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import * as d3 from 'd3'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const mapContainer = ref(null)

// Define Vue props
const props = defineProps({
  selectedCategory: {
    type: String,
    default: ''
  },
  selectedCountry: {
    type: String,
    default: ''
  },
  categoryOptions: {
    type: Array,
    default: () => []
  }
})

// Define Vue events we can emit to the parent
const emit = defineEmits(['countrySelected', 'updateCategory'])

// Define color scale based on sentiment
const colorScale = {
  Positive: '#48c774', // Bulma success (green)
  Negative: '#f14668', // Bulma danger (red)
  Neutral: '#a1a1a1',  // Grey
  InsufficientData: '#d3d3d3',
  NoData: '#e0e0e0',   // Light grey for empty
  Selected: '#3273dc'  // Blue for selected country
}

// Variables to hold D3 objects for zoom buttons
let svgSelection = null
let zoomBehavior = null
let mapGroup = null
let tooltip = null
let selectedCountryId = props.selectedCountry || null
let sentimentMap = {}
let defaultTransform = d3.zoomIdentity

const buildSummaryUrl = () => {
  const baseUrl = `${API_BASE}/api/news/summary`
  if (props.selectedCategory && props.selectedCategory.trim() !== '') {
    return `${baseUrl}?category=${encodeURIComponent(props.selectedCategory)}`
  }
  return baseUrl
}

const getCountryName = (element) => {
  return d3.select(element).attr('aria-label') || d3.select(element).attr('id') || 'Unknown'
}

const getFillForCountry = (countryId) => {
  if (selectedCountryId && countryId === selectedCountryId) {
    return colorScale.Selected
  }

  if (countryId && sentimentMap[countryId]) {
    return colorScale[sentimentMap[countryId]] || colorScale.NoData
  }

  return colorScale.NoData
}

const highlightSelectedCountry = () => {
  if (!mapGroup) return

  mapGroup.selectAll('path')
    .style('stroke', 'var(--map-stroke)')
    .style('stroke-width', '0.6px')
    .style('opacity', 1)

  if (selectedCountryId) {
    mapGroup.selectAll('path')
      .filter(function () {
        return (d3.select(this).attr('id') || '').toUpperCase() === selectedCountryId
      })
      .style('stroke', 'var(--map-stroke-selected)')
      .style('stroke-width', '2px')
      .style('opacity', 1)
  }
}

const updateMapColors = (useTransition = true) => {
  if (!mapGroup) return

  const selection = mapGroup.selectAll('path')

  if (useTransition) {
    selection
      .transition()
      .duration(700)
      .style('fill', function () {
        const pathId = (d3.select(this).attr('id') || '').toUpperCase()
        return getFillForCountry(pathId)
      })
  } else {
    selection
      .style('fill', function () {
        const pathId = (d3.select(this).attr('id') || '').toUpperCase()
        return getFillForCountry(pathId)
      })
  }

  highlightSelectedCountry()
}

const fetchAndApplySummary = async () => {
  if (!mapGroup) return

  try {
    // Fetch sentiment summary data
    const response = await fetch(buildSummaryUrl())
    const data = await response.json()
    sentimentMap = data.sentiments || {}

    updateMapColors(true)
  } catch (error) {
    console.error('Error fetching filtered map data:', error)
  }
}

const fitMapToContainer = () => {
  if (!svgSelection || !mapGroup || !mapContainer.value || !zoomBehavior) return

  const containerWidth = mapContainer.value.clientWidth
  const containerHeight = mapContainer.value.clientHeight

  if (!containerWidth || !containerHeight) return

  const bounds = mapGroup.node().getBBox()
  const boundsWidth = bounds.width
  const boundsHeight = bounds.height
  const boundsCenterX = bounds.x + boundsWidth / 2
  const boundsCenterY = bounds.y + boundsHeight / 2

  if (!boundsWidth || !boundsHeight) return

  const scale = Math.min(
    containerWidth / boundsWidth,
    containerHeight / boundsHeight
  ) * 0.92

  const translateX = containerWidth / 2 - scale * boundsCenterX
  const translateY = containerHeight / 2 - scale * boundsCenterY

  defaultTransform = d3.zoomIdentity.translate(translateX, translateY).scale(scale)

  svgSelection.call(zoomBehavior.transform, defaultTransform)
}

onMounted(async () => {
  if (!mapContainer.value) return

  try {
    // Load the SVG file using D3
    const xml = await d3.xml('/world.svg')

    // Extract the <svg> element
    const svgNode = xml.documentElement

    // Select the container and append the SVG
    const container = d3.select(mapContainer.value)
    container.node().appendChild(svgNode)

    // Select the appended SVG to apply responsive styling
    const svg = container.select('svg')
    svgSelection = svg

    const currentWidth = Number(svg.attr('width')) || 2000
    const currentHeight = Number(svg.attr('height')) || 1000
    const viewBox = svg.attr('viewBox')

    if (!viewBox) {
      svg.attr('viewBox', `0 0 ${currentWidth} ${currentHeight}`)
    }

    svg.attr('width', '100%')
      .attr('height', '100%')
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('display', 'block')
      .style('margin', '0 auto')

    // Prepare for Zooming: Wrap all paths in a <g> tag if they aren't already
    // Or just group them all into a new g tag
    const paths = svg.selectAll('path')

    // Create a group and move all paths into it
    const g = svg.append('g').attr('class', 'map-group')
    mapGroup = g

    paths.each(function () {
      g.node().appendChild(this)
    })

    // Set base style
    g.selectAll('path')
      .style('fill', colorScale.NoData)
      .style('stroke', 'var(--map-stroke)')
      .style('stroke-width', '0.6px')
      // We use CSS transition for smoother hover effects
      .style('transition', 'fill 0.35s ease, filter 0.2s ease, transform 0.2s ease, opacity 0.2s ease')

    // Setup Tooltip
    // Create a div for the tooltip and append to body
    tooltip = d3.select('body')
      .append('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(15, 23, 42, 0.95)')
      .style('color', '#ffffff')
      .style('padding', '10px 12px')
      .style('border-radius', '8px')
      .style('border', '1px solid rgba(255,255,255,0.15)')
      .style('box-shadow', '0 8px 24px rgba(0,0,0,0.28)')
      .style('font-size', '14px')
      .style('line-height', '1.4')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000)
      .style('max-width', '220px')

    // Add interactivity
    g.selectAll('path')
      .on('mouseover', function (event) {
        // Pop out effect: bring to front to avoid overlapping clipping
        this.parentNode.appendChild(this)

        // Apply visual pop
        d3.select(this)
          .style('filter', 'drop-shadow(0px 4px 8px rgba(0,0,0,0.35))')
          .style('transform', 'translateY(-1px)')

        // Get country name from aria-label or id
        const countryName = getCountryName(this)
        const countryId = (d3.select(this).attr('id') || '').toUpperCase()
        const rawLabel = selectedCountryId === countryId
          ? 'Selected'
          : (sentimentMap[countryId] || 'NoData')

        const sentimentLabel =
          rawLabel === 'NoData'
            ? 'No Data'
            : rawLabel === 'InsufficientData'
              ? 'Insufficient Data'
              : rawLabel

        tooltip
          .transition()
          .duration(150)
          .style('opacity', 1)

        tooltip
          .html(`
            <div style="font-weight: 700; color: #ffffff; margin-bottom: 4px;">
              ${countryName}
            </div>
            <div style="color: #cbd5e1;">
              ${sentimentLabel}
            </div>
          `)
          .style('left', `${event.pageX + 15}px`)
          .style('top', `${event.pageY - 28}px`)
      })
      .on('mousemove', function (event) {
        // Move tooltip with mouse
        tooltip
          .style('left', `${event.pageX + 15}px`)
          .style('top', `${event.pageY - 28}px`)
      })
      .on('mouseout', function () {
        // Revert visual pop
        d3.select(this)
          .style('filter', 'none')
          .style('transform', 'none')

        // Hide tooltip
        tooltip.transition().duration(200).style('opacity', 0)
      })
      .on('click', function (event) {
        event.stopPropagation()

        const countryId = (d3.select(this).attr('id') || '').toUpperCase()

        if (countryId) {
          selectedCountryId = countryId
          updateMapColors(false)

          // Emit the Vue event!
          emit('countrySelected', countryId)
        }
      })

    // Zoom behavior
    zoomBehavior = d3.zoom()
      .scaleExtent([0.7, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoomBehavior)

    await nextTick()
    fitMapToContainer()
    await fetchAndApplySummary()

    window.addEventListener('resize', fitMapToContainer)
  } catch (error) {
    console.error('Error loading SVG map or fetching data:', error)
  }
})

watch(
  () => props.selectedCategory,
  async () => {
    await fetchAndApplySummary()
  }
)

watch(
  () => props.selectedCountry,
  (newCountry) => {
    selectedCountryId = newCountry || null
    updateMapColors(false)
  }
)

onBeforeUnmount(() => {
  if (tooltip) {
    tooltip.remove()
  }

  window.removeEventListener('resize', fitMapToContainer)
})

// Programmatic zoom functions
const handleZoomIn = () => {
  if (svgSelection && zoomBehavior) {
    svgSelection.transition().duration(300).call(zoomBehavior.scaleBy, 1.25)
  }
}

const handleZoomOut = () => {
  if (svgSelection && zoomBehavior) {
    svgSelection.transition().duration(300).call(zoomBehavior.scaleBy, 0.8)
  }
}

const handleReset = () => {
  if (svgSelection && zoomBehavior) {
    selectedCountryId = null
    updateMapColors(false)
    svgSelection.transition().duration(650).call(zoomBehavior.transform, defaultTransform)
  }
}
</script>

<template>
  <div class="map-wrapper">
    <div class="map-header">
      <div class="legend">
        <span class="legend-item"><span class="legend-color" style="background-color: #48c774;"></span> Positive</span>
        <span class="legend-item"><span class="legend-color" style="background-color: #f14668;"></span> Negative</span>
        <span class="legend-item"><span class="legend-color" style="background-color: #a1a1a1;"></span> Neutral</span>
        <span class="legend-item"><span class="legend-color" style="background-color: var(--map-no-data);"></span> No Data</span>
        <span class="legend-item"><span class="legend-color" style="background-color: #3273dc;"></span> Selected</span>
      </div>

      <div class="map-tools">
        <div class="select is-small is-rounded is-info mr-2 category-select-wrap">
          <select :value="selectedCategory" @change="emit('updateCategory', $event.target.value)">
            <option
              v-for="option in categoryOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="zoom-controls buttons has-addons mb-0">
          <button class="button is-small" @click="handleZoomIn" title="Zoom In">
            <strong>+</strong>
          </button>
          <button class="button is-small" @click="handleZoomOut" title="Zoom Out">
            <strong>-</strong>
          </button>
          <button class="button is-small" @click="handleReset" title="Reset Map">
            Reset
          </button>
        </div>
      </div>
    </div>

    <div ref="mapContainer" class="world-map"></div>
  </div>
</template>

<style scoped>
.map-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 520px;
  padding: 1.5rem;
  background-color: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  margin-bottom: 0;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  gap: 1rem;
}

.legend {
  display: flex;
  justify-content: flex-start;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-main);
}

.legend-color {
  width: 14px;
  height: 14px;
  display: inline-block;
  margin-right: 8px;
  border-radius: 3px;
}

.map-tools {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.category-badge {
  background: #f0f4ff;
  color: #2949b6;
  border: 1px solid #d6e0ff;
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: capitalize;
}

.zoom-controls .button {
  background-color: var(--bg-panel-light);
  border-color: var(--border-color);
  color: var(--text-main);
}

.zoom-controls .button:hover {
  background-color: var(--bg-panel);
}

.world-map {
  width: 100%;
  flex: 1;
  min-height: 420px;
  height: 100%;
  overflow: hidden;
  touch-action: none;
}

/* Hover style managed by D3 now, but cursor can stay here */
:deep(path) {
  cursor: pointer;
  outline: none;
  transform-box: fill-box;
  transform-origin: center;
}

@media screen and (max-width: 768px) {
  .map-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .map-tools {
    width: 100%;
    justify-content: space-between;
  }

  .world-map {
    min-height: 320px;
  }
}
</style>le>