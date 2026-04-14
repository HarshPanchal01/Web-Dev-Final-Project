<script setup>
import { onMounted, ref } from "vue";
import * as d3 from "d3";

const mapContainer = ref(null);

// Emit event to parent
const emit = defineEmits(["countrySelected"]);

// Colors
const baseFill = "#e0e0e0";
const hoverStroke = "#111827";
const selectedFill = "#48c774";

// D3 references
let svgSelection = null;
let zoomBehavior = null;
let mapGroup = null;
let selectedPath = null;
let tooltip = null;

const applyBaseStyles = () => {
  if (!mapGroup) return;

  mapGroup
    .selectAll("path")
    .style("fill", baseFill)
    .style("stroke", "#ffffff")
    .style("stroke-width", "0.5px")
    .style(
      "transition",
      "fill 0.3s ease, filter 0.2s ease, transform 0.2s ease"
    );
};

const clearPreviousSelection = () => {
  if (!selectedPath) return;

  selectedPath
    .style("fill", baseFill)
    .style("stroke", "#ffffff")
    .style("stroke-width", "0.5px");

  selectedPath = null;
};

onMounted(async () => {
  if (!mapContainer.value) return;

  try {
    const xml = await d3.xml("/world.svg");
    const svgNode = xml.documentElement;

    const container = d3.select(mapContainer.value);
    container.node().appendChild(svgNode);

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

    const paths = svg.selectAll("path");

    mapGroup = svg.append("g").attr("class", "map-group");
    paths.each(function () {
      mapGroup.node().appendChild(this);
    });

    applyBaseStyles();

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

    mapGroup
      .selectAll("path")
      .on("mouseover", function (event) {
        this.parentNode.appendChild(this);

        d3.select(this)
          .style("filter", "drop-shadow(0px 4px 6px rgba(0,0,0,0.4))")
          .style("transform", "translateY(-2px)");

        const countryName =
          d3.select(this).attr("aria-label") || d3.select(this).attr("id");

        tooltip.transition().duration(200).style("opacity", 1);
        tooltip
          .html(`<strong>${countryName || "Unknown Country"}</strong>`)
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).style("filter", "none").style("transform", "none");

        tooltip.transition().duration(300).style("opacity", 0);
      })
      .on("click", function () {
        const clicked = d3.select(this);
        const countryId = clicked.attr("id");

        if (!countryId) return;

        clearPreviousSelection();

        clicked
          .style("fill", selectedFill)
          .style("stroke", hoverStroke)
          .style("stroke-width", "1px");

        selectedPath = clicked;

        emit("countrySelected", countryId.toLowerCase());
      });

    // Zoom behavior
    zoomBehavior = d3
      .zoom()
      .scaleExtent([0.5, 8])
      .on("zoom", (event) => {
        mapGroup.attr("transform", event.transform);
      });

    svg.call(zoomBehavior);

    const initialTransform = d3.zoomIdentity.translate(200, 10).scale(0.55);
    svg.call(zoomBehavior.transform, initialTransform);
  } catch (error) {
    console.error("Error loading SVG map:", error);
  }
});

// Zoom controls
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

  clearPreviousSelection();
};
</script>

<template>
  <div class="map-wrapper box">
    <div class="map-header">
      <div class="legend">
        <span class="legend-item">
          <span
            class="legend-color"
            style="background-color: #48c774"
          ></span>
          Selected
        </span>
        <span class="legend-item">
          <span
            class="legend-color"
            style="background-color: #e0e0e0"
          ></span>
          Available
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
    align-items: flex-start;
  }
}
</style>
