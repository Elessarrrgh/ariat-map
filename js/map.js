/**
 * map.js – Mapbox GL JS map initialisation and interaction logic
 *
 * Responsibilities:
 *  - Initialise the map centred on the United States
 *  - Load GeoJSON data via data.js
 *  - Render locations as colour-coded circle points
 *  - Show click popups with name / type / city+state
 *  - Change cursor to pointer on hover
 *  - Wire up the checkbox filter panel
 */

import { loadLocations } from './data.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Replace this placeholder with your own Mapbox public access token.
 * Get one for free at https://account.mapbox.com/
 *
 * IMPORTANT: Never commit a real token to a public repository.
 * Consider loading it from an environment variable or a config file
 * that is listed in .gitignore.
 */
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYnIwYzBubjByIiwiYSI6ImNsZGdwZTF2aDAxYm8zb210em11NGF5eGIifQ.ziYpFIsV1MqW_Rwfds5ohA';

/** Map style – swap for any Mapbox style URL */
const MAP_STYLE = 'mapbox://styles/mapbox/light-v11';

/** Initial camera for the United States */
const INITIAL_VIEW = {
  center: [-98.5795, 39.8283],
  zoom: 3.5,
};

/** GeoJSON source identifier used throughout this file */
const SOURCE_ID = 'locations';

/** Circle layer identifier */
const LAYER_ID = 'locations-circles';

/**
 * Colour mapping keyed by the "type" property value in the GeoJSON.
 * Extend this object to support additional types without touching
 * the layer paint expression below.
 */
const TYPE_COLORS = {
  Ariat:   '#3b82f6', // blue
  School:  '#ef4444', // red
  Academy: '#22c55e', // green
  SCHEELS: '#a855f7', // purple
};

/** Fallback colour for any type not listed in TYPE_COLORS */
const FALLBACK_COLOR = '#6b7280'; // gray

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a Mapbox match expression that maps "type" property values
 * to colours, falling back to FALLBACK_COLOR.
 *
 * @returns {Array} Mapbox GL JS expression array
 */
function buildColorExpression() {
  // ['match', input, v1, out1, v2, out2, ..., fallback]
  const pairs = Object.entries(TYPE_COLORS).flatMap(([type, color]) => [type, color]);
  return ['match', ['get', 'type'], ...pairs, FALLBACK_COLOR];
}

/**
 * Build a CSS class name for popup styling from a type string.
 * Returns 'other' for unknown types.
 *
 * @param {string} type
 * @returns {string}
 */
function typeClass(type) {
  const known = ['ariat', 'school', 'academy', 'scheels'];
  const key = (type ?? '').toLowerCase();
  return known.includes(key) ? key : 'other';
}

/**
 * Return a sanitised string to safely insert into HTML.
 * Prevents XSS when displaying user-supplied data in popups.
 *
 * @param {unknown} value
 * @returns {string}
 */
function sanitise(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

// ---------------------------------------------------------------------------
// Filter panel
// ---------------------------------------------------------------------------

/**
 * Build the checkbox filter panel and append it to the map as a
 * custom control in the top-left corner.
 *
 * @param {mapboxgl.Map} map
 */
function addFilterPanel(map) {
  const panel = document.getElementById('filter-panel');
  if (!panel) return;

  // One checkbox per type
  Object.entries(TYPE_COLORS).forEach(([type, color]) => {
    const label = document.createElement('label');
    label.className = 'filter-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.dataset.type = type;
    checkbox.setAttribute('aria-label', `Show ${type} locations`);

    const swatch = document.createElement('span');
    swatch.className = `filter-swatch ${type.toLowerCase()}`;
    swatch.style.backgroundColor = color;

    const text = document.createElement('span');
    text.textContent = type;

    label.appendChild(checkbox);
    label.appendChild(swatch);
    label.appendChild(text);
    panel.appendChild(label);

    // Re-filter map whenever a checkbox changes
    checkbox.addEventListener('change', () => applyFilters(map));
  });

  // Show the panel now that it has content
  panel.style.display = 'block';
}

/**
 * Read all checkboxes and apply a Mapbox filter expression so that
 * only the selected types are visible.
 *
 * @param {mapboxgl.Map} map
 */
function applyFilters(map) {
  const checkboxes = document.querySelectorAll('#filter-panel input[type="checkbox"]');
  const activeTypes = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.dataset.type);

  // ['in', ['get', 'type'], ['literal', [...]]] – show only matching types
  const filter = ['in', ['get', 'type'], ['literal', activeTypes]];
  map.setFilter(LAYER_ID, filter);
}

// ---------------------------------------------------------------------------
// Popup
// ---------------------------------------------------------------------------

/**
 * Show a popup at the clicked feature's location.
 *
 * @param {mapboxgl.Map} map
 * @param {mapboxgl.MapMouseEvent & { features: mapboxgl.MapboxGeoJSONFeature[] }} e
 */
function showPopup(map, e) {
  const feature = e.features[0];
  const coords = feature.geometry.coordinates.slice();
  const { name, type, city, state } = feature.properties;

  // Build location line only when city/state are available
  const locationLine = (city || state)
    ? `<p class="popup-location">${sanitise(city)}${city && state ? ', ' : ''}${sanitise(state)}</p>`
    : '';

  const html = `
    <p class="popup-name">${sanitise(name)}</p>
    <p class="popup-type ${typeClass(type)}">${sanitise(type)}</p>
    ${locationLine}
  `;

  // Handle map wrapping: keep the popup near the clicked point
  while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
    coords[0] += e.lngLat.lng > coords[0] ? 360 : -360;
  }

  new mapboxgl.Popup({ closeButton: true, focusAfterOpen: true, maxWidth: '240px' })
    .setLngLat(coords)
    .setHTML(html)
    .addTo(map);
}

// ---------------------------------------------------------------------------
// Map initialisation
// ---------------------------------------------------------------------------

/**
 * Initialise the Mapbox GL JS map, load data, add layers and interactions.
 */
async function initMap() {
  if (MAPBOX_TOKEN === 'YOUR_MAPBOX_ACCESS_TOKEN_HERE') {
    throw new Error(
      'Mapbox access token not set. Replace MAPBOX_TOKEN in js/map.js with your token from https://account.mapbox.com/'
    );
  }

  mapboxgl.accessToken = MAPBOX_TOKEN;

  const map = new mapboxgl.Map({
    container: 'map',
    style: MAP_STYLE,
    center: INITIAL_VIEW.center,
    zoom: INITIAL_VIEW.zoom,
  });

  // Navigation controls (zoom + compass)
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');

  // Wait for map style to finish loading before adding data
  map.on('load', async () => {
    let geojson;
    try {
      geojson = await loadLocations();
      console.info(`[map] Loaded ${geojson.features?.length ?? 0} location feature(s).`);
    } catch (err) {
      console.error('Could not load location data:', err);
      return;
    }

    if (!Array.isArray(geojson.features)) {
      console.error('[map] Location payload is not a valid GeoJSON FeatureCollection.', geojson);
      return;
    }

    // ------------------------------------------------------------------
    // Add GeoJSON source
    // ------------------------------------------------------------------
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: geojson,
    });

    // ------------------------------------------------------------------
    // Circle layer – colour driven by the "type" property
    // ------------------------------------------------------------------
    map.addLayer({
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-color': buildColorExpression(),
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          3, 5,   // small at low zoom
          10, 10, // larger when zoomed in
        ],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    });

    // ------------------------------------------------------------------
    // Click interaction – show popup
    // ------------------------------------------------------------------
    map.on('click', LAYER_ID, (e) => showPopup(map, e));

    // ------------------------------------------------------------------
    // Hover interaction – pointer cursor
    // ------------------------------------------------------------------
    map.on('mouseenter', LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', LAYER_ID, () => {
      map.getCanvas().style.cursor = '';
    });

    // ------------------------------------------------------------------
    // Filter panel
    // ------------------------------------------------------------------
    addFilterPanel(map);
    applyFilters(map);
  });
}

// Boot the app
initMap();
