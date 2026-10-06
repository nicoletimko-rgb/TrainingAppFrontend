# Summer Training App

A basketball training website featuring skill-based drills, animated court diagrams, instructional videos, and a strength exercise search.

**Live site:** https://nicoletimko-rgb.github.io/TrainingAppFrontend/

## Features

- Browse shooting, ball handling, finishing, defense, and conditioning drills.
- Filter drills by experience level.
- Open a drill to view its description, court diagram, and available video.
- Select a muscle focus and difficulty in **Strength** to retrieve exercises from the backend.

## How the backend connection works

The Strength form sends the selected `focus` and `level` as JSON to `POST /api/exercises` on the Flask service hosted by Render. The backend validates the input, requests data from API Ninjas using its private API key, and returns JSON. The frontend displays the returned exercises and handles request errors.

The Render service URL is set in `API_BASE` near the top of `app.js`. This URL is public. The API Ninjas key is stored **only on the backend**, never in this repo.

The basketball drill list, court diagrams, and video links are managed in `app.js`. Browsing those drills does not call the backend.

## Run locally

From the frontend folder, run:

```bash
python3 -m http.server 5500
```

Open http://localhost:5500/ in your browser. Use this address rather than opening `index.html` as a `file://` page, especially when testing embedded YouTube videos.

By default, `app.js` calls the deployed Render backend. To test against a backend running locally on port `5001`, temporarily change `API_BASE` in `app.js` to `http://localhost:5001`. Ensure the backend's `FRONTEND_ORIGINS` includes `http://localhost:5500`.

## Project structure

- `index.html` — page structure
- `style.css` — site styling
- `app.js` — drill library, video viewer, and Strength API request
- `assets/` — local images and other site assets

## Deployment

The frontend is published with GitHub Pages. Changes pushed to this repository appear on the live site after GitHub Pages finishes deploying.