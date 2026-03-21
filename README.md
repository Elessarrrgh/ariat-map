# Ariat Map

A clean, production-ready web-based interactive map application built with [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/). It visualises location data (Ariat stores, competitor retailers, and schools) using GeoJSON, with a filter panel for toggling visibility by location type.

---

## Project Structure

```
ariat-map/
├── index.html                  # Main entry point
├── data/
│   └── locations.geojson       # Sample location dataset
├── js/
│   ├── map.js                  # Map initialisation, layers, popups, filters
│   └── data.js                 # Data loading / transformation layer
├── styles/
│   └── main.css                # Application styles
├── LICENSE
└── README.md
```

---

## Getting Started

### 1. Add your Mapbox Access Token

Open `js/map.js` and replace the placeholder token near the top of the file:

```js
const MAPBOX_TOKEN = 'YOUR_MAPBOX_ACCESS_TOKEN_HERE';
```

Get a free token at <https://account.mapbox.com/>. Keep your real token out of
public repositories — consider using a `.env` file (added to `.gitignore`) and
injecting the value at build time.

### 2. Run locally with a simple HTTP server

Because `map.js` uses ES6 modules (`import`/`export`) and fetches a local JSON
file, you **cannot** open `index.html` directly from the filesystem (`file://`).
You need to serve it over HTTP.

**Option A – Python (no install required)**

```bash
# Python 3
python3 -m http.server 8080
```

Then open <http://localhost:8080> in your browser.

**Option B – Node.js**

```bash
npx serve .
```

**Option C – VS Code Live Server extension**

Right-click `index.html` → *Open with Live Server*.

---

## Replacing the GeoJSON Data

The sample dataset lives in `data/locations.geojson`. It follows standard
GeoJSON `FeatureCollection` format:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [-104.99, 39.74] },
      "properties": {
        "name": "My Location",
        "type": "Ariat",
        "city": "Denver",
        "state": "CO"
      }
    }
  ]
}
```

Supported `type` values (controls dot colour):

| type    | colour |
|---------|--------|
| Ariat   | blue   |
| School  | red    |
| Academy | green  |
| SCHEELS | purple |
| *(other)* | gray |

To add a new type, add it to the `TYPE_COLORS` map in `js/map.js` and add a
matching `.filter-swatch` rule in `styles/main.css`.

---

## Integrating a Live API (Airtable)

`js/data.js` is the single place responsible for fetching and transforming
location data. To switch from the static GeoJSON file to a live Airtable
source:

1. Replace the body of `loadLocations()` with an Airtable API call.
2. Uncomment and adapt `transformAirtableToGeoJSON()` in the same file.
3. Map your Airtable field names to the `name`, `type`, `city`, and `state`
   properties expected by the map.

The helper function template is already included in `js/data.js` as comments.

Example:

```js
export async function loadLocations() {
  const resp = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`,
    { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } }
  );
  const json = await resp.json();
  return transformAirtableToGeoJSON(json.records);
}
```

---

## Future Roadmap

- [ ] Live Airtable API integration
- [ ] Marker clustering for dense areas
- [ ] Advanced filtering (by state, region, search)
- [ ] Geospatial analysis (radius search, nearest-location)
- [ ] Export filtered results to CSV

---

## License

[MIT](./LICENSE)

