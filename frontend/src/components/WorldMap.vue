<script setup>
import { onMounted, ref } from 'vue'
import * as d3 from 'd3'

const mapContainer = ref(null)

// Define Vue events we can emit to the parent
const emit = defineEmits(['countrySelected'])

// Define color scale based on sentiment
const colorScale = {
  'Positive': '#48c774', // Bulma success (green)
  'Negative': '#f14668', // Bulma danger (red)
  'Neutral': '#a1a1a1',  // Grey
  'NoData': '#e0e0e0'    // Light grey for empty
}

// Variables to hold D3 objects for zoom buttons
let svgSelection = null
let zoomBehavior = null

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
    
    const currentWidth = svg.attr('width') || 2000
    const currentHeight = svg.attr('height') || 1000
    const viewBox = svg.attr('viewBox')
    
    if (!viewBox) {
        svg.attr('viewBox', `0 0 ${currentWidth} ${currentHeight}`)
    }
    
    svg.attr('width', '100%')
       .attr('height', 'auto')
       .style('max-height', '80vh') // keep it from getting too tall
       .style('display', 'block')
       .style('margin', '0 auto')

    // Prepare for Zooming: Wrap all paths in a <g> tag if they aren't already
    // Or just group them all into a new g tag
    const paths = svg.selectAll('path')
    
    // Create a group and move all paths into it
    const g = svg.append('g').attr('class', 'map-group')
    paths.each(function() {
      g.node().appendChild(this)
    })
       
    // Set base style
    g.selectAll('path')
       .style('fill', colorScale.NoData)
       .style('stroke', '#ffffff')
       .style('stroke-width', '0.5px')
       // We use CSS transition for smoother hover effects
       .style('transition', 'fill 0.5s ease, filter 0.2s ease, transform 0.2s ease')

    // Fetch sentiment summary data
    const response = await fetch('http://localhost:3000/api/news/summary')
    const data = await response.json()
    const sentiments = data.sentiments || {}

    // Apply colors using D3 transitions
    g.selectAll('path')
       .transition()
       .duration(1000) // smooth 1-second transition
       .style('fill', function() {
           const pathId = d3.select(this).attr('id');
           if (pathId && sentiments[pathId]) {
               return colorScale[sentiments[pathId]];
           }
           return colorScale.NoData;
       })

    // Setup Tooltip
    // Create a div for the tooltip and append to body
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'absolute')
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '14px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000)

    // Add interactivity
    g.selectAll('path')
       .on('mouseover', function(event, d) {
           // Pop out effect: bring to front to avoid overlapping clipping
           this.parentNode.appendChild(this);
           
           // Apply visual pop
           d3.select(this)
             .style('filter', 'drop-shadow(0px 4px 6px rgba(0,0,0,0.4))')
             .style('transform', 'translateY(-2px)');

           // Get country name from aria-label or id
           const countryName = d3.select(this).attr('aria-label') || d3.select(this).attr('id');
           
           tooltip.transition().duration(200).style('opacity', 1);
           tooltip.html(`<strong>${countryName}</strong>`)
                  .style('left', (event.pageX + 15) + 'px')
                  .style('top', (event.pageY - 28) + 'px');
       })
       .on('mousemove', function(event) {
           // Move tooltip with mouse
           tooltip.style('left', (event.pageX + 15) + 'px')
                  .style('top', (event.pageY - 28) + 'px');
       })
       .on('mouseout', function(event, d) {
           // Revert visual pop
           d3.select(this)
             .style('filter', 'none')
             .style('transform', 'none');
             
           // Hide tooltip
           tooltip.transition().duration(500).style('opacity', 0);
       })
       .on('click', function(event, d) {
           const countryId = d3.select(this).attr('id');
           if (countryId) {
             // Emit the Vue event!
             emit('countrySelected', countryId);
           }
       });

    // Zoom behavior
    zoomBehavior = d3.zoom()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);

  } catch (error) {
    console.error("Error loading SVG map or fetching data:", error)
  }
})

// Programmatic zoom functions
const handleZoomIn = () => {
  if (svgSelection && zoomBehavior) {
    svgSelection.transition().duration(300).call(zoomBehavior.scaleBy, 1.3);
  }
}

const handleZoomOut = () => {
  if (svgSelection && zoomBehavior) {
    svgSelection.transition().duration(300).call(zoomBehavior.scaleBy, 0.77);
  }
}

const handleReset = () => {
  if (svgSelection && zoomBehavior) {
    svgSelection.transition().duration(750).call(zoomBehavior.transform, d3.zoomIdentity);
  }
}
</script>

<template>
  <div class="map-wrapper box">
    <div class="map-header">
      <div class="legend">
        <span class="legend-item"><span class="legend-color" style="background-color: #48c774;"></span> Positive</span>
        <span class="legend-item"><span class="legend-color" style="background-color: #f14668;"></span> Negative</span>
        <span class="legend-item"><span class="legend-color" style="background-color: #a1a1a1;"></span> Neutral</span>
        <span class="legend-item"><span class="legend-color" style="background-color: #e0e0e0;"></span> No Data</span>
      </div>
      <div class="zoom-controls buttons has-addons mb-0">
        <button class="button is-small" @click="handleZoomIn" title="Zoom In">
          <strong>+</strong>
        </button>
        <button class="button is-small" @click="handleZoomOut" title="Zoom Out">
          <strong>-</strong>
        </button>
        <button class="button is-small is-light" @click="handleReset" title="Reset Map">
          Reset
        </button>
      </div>
    </div>
    <div ref="mapContainer" class="world-map"></div>
  </div>
</template>

<style scoped>
.map-wrapper {
  width: 100%;
  padding: 1.5rem;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  position: relative;
  overflow: hidden;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.legend {
  display: flex;
  justify-content: flex-start;
  gap: 1.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 500;
  color: #4a4a4a;
}

.legend-color {
  width: 14px;
  height: 14px;
  display: inline-block;
  margin-right: 8px;
  border-radius: 3px;
}

.world-map {
  width: 100%;
  /* This prevents panning from dragging the whole page on mobile */
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
  }
}
</style>