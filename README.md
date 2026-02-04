# Melodifestivalen 2026 Data Visualizer

A static React app that visualizes daily Spotify chart CSVs for Melodifestivalen songs. It runs entirely in the browser and can be hosted on GitHub Pages.

## Features
- Hidden admin route at `#/mfst-sets` for song setup and CSV uploads
- Filters by round and date range
- Two line charts: Streams (higher is better) and Rank (lower is better)
- LocalStorage persistence + JSON export/import

## CSV Requirements
Filename must include a date like `2026-02-03` (example: `regional-se-daily-2026-02-03.csv`).

Columns used:
- `uri` (unique identifier)
- `rank`
- `artist_names`
- `track_name`
- `streams`

Only songs configured in the admin page are stored; all other rows are ignored.

## Development
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

The output folder is `dist`. Configure GitHub Pages to serve the built files from `dist` (via a deploy workflow or by publishing a `gh-pages` branch).

## GitHub Pages (Actions)
This repo includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.

Steps:
1. Push to `main`.
2. In GitHub, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The workflow will build and deploy automatically.

## Shared Data File (Variant A)
The published site reads `public/data/mfst-data.json` when no LocalStorage data exists.
The app always attempts to load `public/data/mfst-data.json` on startup and will replace local data if the file is available.

Workflow:
1. Open admin page (`#/mfst-sets`), upload CSVs, configure songs.
2. Click **Link repo file** (Chromium browsers) and select `public/data/mfst-data.json` once.
3. From now on, updates auto-save to the linked file.
4. Commit + push. GitHub Pages rebuilds and everyone sees the new data.

Fallback:
- If file linking is not available, use **Export JSON** and manually replace `public/data/mfst-data.json`.
