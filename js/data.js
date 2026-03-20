/**
 * data.js – Data loading and transformation layer
 *
 * This module abstracts where location data comes from.
 * Currently it loads a static GeoJSON file, but the structure
 * makes it straightforward to swap in a live API (e.g. Airtable)
 * by replacing the body of `loadLocations` below.
 */

/**
 * Load location data and return a GeoJSON FeatureCollection.
 *
 * To switch to a live API source, replace this function body with
 * a fetch call to your API endpoint and transform the response into
 * the same GeoJSON structure:
 *
 *   {
 *     type: 'FeatureCollection',
 *     features: [
 *       {
 *         type: 'Feature',
 *         geometry: { type: 'Point', coordinates: [lng, lat] },
 *         properties: { name, type, city, state, ... }
 *       },
 *       ...
 *     ]
 *   }
 *
 * Example Airtable integration (future):
 *   const resp = await fetch(
 *     'https://api.airtable.com/v0/<BASE_ID>/<TABLE_NAME>',
 *     { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } }
 *   );
 *   const json = await resp.json();
 *   return transformAirtableToGeoJSON(json.records);
 *
 * @returns {Promise<GeoJSON.FeatureCollection>}
 */
export async function loadLocations() {
  const response = await fetch('./data/locations.geojson');

  if (!response.ok) {
    throw new Error(`Failed to load location data: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * (Placeholder) Transform Airtable records into a GeoJSON FeatureCollection.
 *
 * Uncomment and adapt this function when integrating with Airtable.
 *
 * @param {Array} records – Array of Airtable record objects
 * @returns {GeoJSON.FeatureCollection}
 */
// export function transformAirtableToGeoJSON(records) {
//   return {
//     type: 'FeatureCollection',
//     features: records
//       .filter(r => r.fields.Longitude && r.fields.Latitude)
//       .map(r => ({
//         type: 'Feature',
//         geometry: {
//           type: 'Point',
//           coordinates: [parseFloat(r.fields.Longitude), parseFloat(r.fields.Latitude)],
//         },
//         properties: {
//           name:  r.fields.Name  ?? '',
//           type:  r.fields.Type  ?? '',
//           city:  r.fields.City  ?? '',
//           state: r.fields.State ?? '',
//         },
//       })),
//   };
// }
