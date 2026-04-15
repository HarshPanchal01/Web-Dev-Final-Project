<script setup>
import { onMounted, ref, watch } from "vue";
import * as d3 from "d3";

const mapContainer = ref(null);

// Emit event to parent
const emit = defineEmits(["countrySelected"]);

// Accept selected category from App.vue
const props = defineProps({
  category: {
    type: String,
    default: "",
  },
});

// Define color scale based on sentiment
const colorScale = {
  Positive: "#48c774",
  Negative: "#f14668",
  Neutral: "#a1a1a1",
  NoData: "#e0e0e0",
};

// Variables to hold D3 objects for zoom buttons
let svgSelection = null;
let zoomBehavior = null;
let mapGroup = null;
let tooltip = null;
let currentSentiments = {};
let mapReady = false;

const applyMapColors = () => {
  if (!mapGroup) return;

  mapGroup
    .selectAll("path")
    .transition()
    .duration(1000)
    .style("fill", function () {
      const pathId = d3.select(this).attr("id")?.toLowerCase();
      if (pathId && currentSentiments[pathId]) {
        return colorScale[currentSentiments[pathId]] || colorScale.NoData;
      }
      return colorScale.NoData;
    });
};

const loadSummary = async () => {
  if (!mapReady || !mapGroup) return;

  try {
    const query = props.category
      ? `?category=${encodeURIComponent(props.category)}`
      : "";

    const response = await fetch(`http://localhost:3000/api/news/summary${query}`);
    const data = await response.json();
    currentSentiments = data.sentiments || {};
    applyMapColors();
  } catch (error) {
    console.error("Error fetching summary data:", error);
  }
};

onMounted(async () => {
  if (!mapContainer.value) return;

  try {
    // Load the SVG file using D3
    const xml = await d3.xml("/world.svg");

    // Extract the <svg> element
    const svgNode = xml.documentElement;

    // Select the container and append the SVG
    const container = d3.select(mapContainer.value);
    container.node().appendChild(svgNode);

    // Select the appended SVG to apply responsive styling
    const svg = container.select("svg");
    svgSelection = svg;

    const currentWidth = svg.attr("width") || 2000;
    const currentHeight = svg.attr("height") || 1000;
    const viewBox = svg.attr("viewBox");

    if (!viewBox) {
      svg.attr("viewBox", `0 0 ${currentWidth} ${currentHeight}`);
    }

    svg
      .attr("width", "100%")
      .attr("height", "100%")
      .style("display", "block")
      .style("margin", "0 auto");

    // Grab all existing paths
    const paths = svg.selectAll("path");

    // Create a group and move paths into it
    mapGroup = svg.append("g").attr("class", "map-group");
    paths.each(function () {
      mapGroup.node().appendChild(this);
    });

    // Base styling
    mapGroup
      .selectAll("path")
      .style("fill", colorScale.NoData)
      .style("stroke", "#ffffff")
      .style("stroke-width", "0.5px")
      .style(
        "transition",
        "fill 0.5s ease, filter 0.2s ease, transform 0.2s ease"
      );

    // Tooltip
    tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "d3-tooltip")
      .style("position", "absolute")
      .style("background-color", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "4px")
      .style("font-size", "14px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 1000);

    // Interactivity
    mapGroup
      .selectAll("path")
      .on("mouseover", function (event) {
        this.parentNode.appendChild(this);

        d3.select(this)
          .style("filter", "drop-shadow(0px 4px 6px rgba(0,0,0,0.4))")
          .style("transform", "translateY(-2px)");

        const selection = d3.select(this);
        const countryName = selection.attr("aria-label") || selection.attr("id");
        const pathId = selection.attr("id")?.toLowerCase();
        const sentiment = currentSentiments[pathId] || "NoData";

        tooltip.transition().duration(200).style("opacity", 1);
        tooltip
          .html(`<strong>${countryName}</strong><br/>Sentiment: ${sentiment}`)
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        d3.select(this)
          .style("filter", "none")
          .style("transform", "none");

        tooltip.transition().duration(500).style("opacity", 0);
      })
      .on("click", function () {
        const countryId = d3.select(this).attr("id");
        if (countryId) {
          emit("countrySelected", countryId.toLowerCase());
        }
      });

    // Zoom behavior
    zoomBehavior = d3
      .zoom()
      .scaleExtent([0.5, 8])
      .on("zoom", (event) => {
        mapGroup.attr("transform", event.transform);
      });

    svg.call(zoomBehavior);

    // Initial transform
    const initialTransform = d3.zoomIdentity.translate(200, 10).scale(0.55);
    svg.call(zoomBehavior.transform, initialTransform);

    mapReady = true;
    await loadSummary();
  } catch (error) {
    console.error("Error loading SVG map or fetching data:", error);
  }
});

// Re-fetch summary whenever category changes
watch(
  () => props.category,
  async () => {
    await loadSummary();
  }
);

// Programmatic zoom functions
const handleZoomIn = () => {
  if (svgSelection && zoomBehavior) {
    svgSelection.transition().duration(300).call(zoomBehavior.scaleBy, 1.3);
  }
};

const handleZoomOut = () => {
  if (svgSelection && zoomBehavior) {
    svgSelection.transition().duration(300).call(zoomBehavior.scaleBy, 0.77);
  }
};

const handleReset = () => {
  if (svgSelection && zoomBehavior) {
    const initialTransform = d3.zoomIdentity.translate(200, 10).scale(0.55);
    svgSelection
      .transition()
      .duration(750)
      .call(zoomBehavior.transform, initialTransform);
  }
};
</script>

<template>
  <div class="map-wrapper box">
    <div class="map-header">
      <div class="legend">
        <span class="legend-item">
          <span class="legend-color" style="background-color: #48c774"></span>
          Positive
        </span>
        <span class="legend-item">
          <span class="legend-color" style="background-color: #f14668"></span>
          Negative
        </span>
        <span class="legend-item">
          <span class="legend-color" style="background-color: #a1a1a1"></span>
          Neutral
        </span>
        <span class="legend-item">
          <span class="legend-color" style="background-color: #e0e0e0"></span>
          No Data
        </span>
      </div>

      <div class="zoom-controls buttons has-addons mb-0">
        <button class="button is-small" @click="handleZoomIn" title="Zoom In">
          <strong>+</strong>
        </button>
        <button class="button is-small" @click="handleZoomOut" title="Zoom Out">
          <strong>-</strong>
        </button>
        <button
          class="button is-small is-light"
          @click="handleReset"
          title="Reset Map"
        >
          Reset
        </button>
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
  padding: 1.5rem;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
  margin-bottom: 0;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
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
  flex: 1;
  min-height: 0;
  touch-action: none;
}

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