# Courtside frontend

Static HTML/CSS/JavaScript site. It sends `POST` requests with JSON to the Flask backend:

- `/api/workouts` for a timed basketball drill session.
- `/api/exercises` for strength exercises fetched by the backend from API Ninjas.

Open `app.js` and replace `const API_BASE = "http://localhost:5000";` with your Render URL (for example `https://YOUR-SERVICE.onrender.com`) before publishing. **This URL is public and safe to put in JavaScript. Never put the API Ninjas key here.**

To run locally, use `python3 -m http.server 5500` from this folder and open `http://localhost:5500`. Start the Flask server in another terminal. To publish, push the contents of this folder to a separate GitHub repo and enable **Settings → Pages → Deploy from a branch → main → / (root)**. Ask the backend developer (or edit your own Render service) to include your exact GitHub Pages origin in `FRONTEND_ORIGINS`.

Test a valid workout, an empty workout goal, valid strength search, a strength search with no matches, and an unavailable backend. If the browser reports a CORS error, check `FRONTEND_ORIGINS` on Render. If it reports a network error, check `API_BASE` and the Render deployment.
