/**
 * data.js – Data loading and transformation layer
 *
 * This module hides the source of location data from the map rendering code.
 * It now supports loading from Airtable and still provides a static GeoJSON
 * fallback while frontend-only configuration is being wired in.
 */

const STATIC_DATA_URL = './data/locations.geojson';

const DEFAULT_AIRTABLE_CONFIG = {
  personalAccessToken: '',
  baseId: 'appbgiyIHuB9P9IdG',
  tableName: 'Location Data',
  view: 'List',
  pageSize: 100,
  maxRecords: 0,
  timeoutMs: 15000,
};

const AIRTABLE_FIELDS = ['Name', 'Type', 'Latitude', 'Longitude', 'City', 'State'];

const TYPE_ALIASES = {
  ariat: 'Ariat',
  ncaa: 'NCAA',
  academy: 'Academy',
  scheels: 'SCHEELS',
};

function getRuntimeAirtableConfig() {
  const runtimeConfig = window.AIRTABLE_CONFIG ?? {};
  return {
    ...DEFAULT_AIRTABLE_CONFIG,
    ...runtimeConfig,
  };
}

function hasAirtableConfig(config) {
  return Boolean(config.personalAccessToken && config.baseId && config.tableName);
}

function normalizeType(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';

  const canonical = TYPE_ALIASES[trimmed.toLowerCase()];
  return canonical ?? trimmed;
}

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildAirtableUrl(config, offset = '') {
  const url = new URL(
    `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(config.tableName)}`
  );

  AIRTABLE_FIELDS.forEach((fieldName) => {
    url.searchParams.append('fields[]', fieldName);
  });

  if (config.view) {
    url.searchParams.set('view', config.view);
  }

  if (config.pageSize) {
    url.searchParams.set('pageSize', String(config.pageSize));
  }

  if (config.maxRecords) {
    url.searchParams.set('maxRecords', String(config.maxRecords));
  }

  if (offset) {
    url.searchParams.set('offset', offset);
  }

  return url.toString();
}

async function fetchJson(url, options = {}) {
  const { timeoutMs = 0, ...fetchOptions } = options;
  const controller = timeoutMs ? new AbortController() : null;
  let timeoutId = null;

  if (controller) {
    fetchOptions.signal = controller.signal;
    timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (error) {
    if (controller && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`
    );
  }

  return response.json();
}

async function fetchStaticLocations() {
  console.info('[data] Loading fallback GeoJSON from local file.');
  return fetchJson(STATIC_DATA_URL);
}

async function fetchAirtableRecords(config) {
  const records = [];
  let offset = '';
  let pageCount = 0;

  do {
    const url = buildAirtableUrl(config, offset);
    pageCount += 1;

    console.debug(`[data] Fetching Airtable page ${pageCount}: ${url}`);

    const json = await fetchJson(url, {
      headers: {
        Authorization: `Bearer ${config.personalAccessToken}`,
      },
      timeoutMs: config.timeoutMs,
    });

    if (!Array.isArray(json.records)) {
      throw new Error('Airtable response did not include a records array.');
    }

    records.push(...json.records);
    offset = json.offset ?? '';
  } while (offset);

  console.info(`[data] Airtable returned ${records.length} records across ${pageCount} page(s).`);
  return records;
}

export function transformAirtableToGeoJSON(records) {
  let skippedCount = 0;

  const features = records.flatMap((record) => {
    const fields = record.fields ?? {};
    const latitude = toNumber(fields.Latitude);
    const longitude = toNumber(fields.Longitude);

    if (latitude === null || longitude === null) {
      skippedCount += 1;
      console.warn(
        `[data] Skipping Airtable record "${record.id}" because Latitude/Longitude is missing or invalid.`,
        fields
      );
      return [];
    }

    return [{
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      properties: {
        id: record.id,
        name: String(fields.Name ?? '').trim(),
        type: normalizeType(fields.Type),
        city: String(fields.City ?? '').trim(),
        state: String(fields.State ?? '').trim(),
      },
    }];
  });

  console.info(
    `[data] Built GeoJSON with ${features.length} feature(s).${skippedCount ? ` Skipped ${skippedCount} invalid record(s).` : ''}`
  );

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Load location data and return a GeoJSON FeatureCollection.
 *
 * Runtime Airtable config can be provided from index.html:
 *
 *   window.AIRTABLE_CONFIG = {
 *     personalAccessToken: 'pat...',
 *     baseId: 'app...',
 *     tableName: 'Locations',
 *     view: 'Grid view'
 *   };
 *
 * If Airtable config is missing, the function falls back to the bundled
 * static GeoJSON so the map remains usable during local development.
 *
 * @returns {Promise<GeoJSON.FeatureCollection>}
 */
export async function loadLocations() {
  const airtableConfig = getRuntimeAirtableConfig();

  if (!hasAirtableConfig(airtableConfig)) {
    console.warn(
      '[data] Airtable config is incomplete. Set window.AIRTABLE_CONFIG with personalAccessToken, baseId, and tableName to enable live data.'
    );
    return fetchStaticLocations();
  }

  try {
    const records = await fetchAirtableRecords(airtableConfig);
    return transformAirtableToGeoJSON(records);
  } catch (error) {
    console.error('[data] Airtable load failed. Falling back to local GeoJSON.', error);
    return fetchStaticLocations();
  }
}
