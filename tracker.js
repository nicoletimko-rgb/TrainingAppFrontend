/* ===================================================================
   tracker.js: the two user pages ("My week" and "Workout builder").
   Loaded BEFORE app.js in index.html. It reuses helpers from app.js
   ($, element, cap, CATEGORIES, state, render, API_BASE), which are only
   used when functions run, after both files have loaded.
==================================================================== */

/* ---------- Identity + API helper ---------- */

// Each browser gets a random id, saved once. The backend uses it to keep
// one person's workouts separate from another's (it is not a login).
function userId() {
  let id = localStorage.getItem("trainingUserId");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("trainingUserId", id); }
  return id;
}

// Calls the backend with JSON and the user id header; throws a readable Error on failure.
async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", "X-User-Id": userId() }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

// Turns a fetch failure into a friendly message (Render free servers sleep).
const errorText = error => error instanceof TypeError
  ? "Cannot reach the backend. It may be waking up, so try again in a few seconds."
  : error.message;

/* ---------- Date + number helpers ---------- */

// Date -> "YYYY-MM-DD" in the user's local time (toISOString would use UTC and can shift the day).
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// Parse "YYYY-MM-DD" as a local date.
const fromIso = s => new Date(`${s}T00:00:00`);
// The Monday of the week containing date d (weeks run Monday to Sunday).
function mondayOf(d) { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
const shortDate = d => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
// "34/50 (68%)" or "none" when no shots were taken.
const shotText = (made, attempted) => attempted ? `${made}/${attempted} (${Math.round(made / attempted * 100)}%)` : "no shots";

// A <label> wrapping an <input>; returns [label, input] so callers can read input.value.
function field(text, attrs) {
  const label = element("label", "", text);
  const input = Object.assign(document.createElement("input"), attrs);
  label.append(input);
  return [label, input];
}

/* ===================================================================
   PAGE 1: MY WEEK (summary)
==================================================================== */

let weekStart = mondayOf(new Date());   // which week is on screen

// Fetches the chosen week from the backend and draws totals + sessions.
async function loadSummary() {
  const status = $("#summary-status"), stats = $("#summary-stats"), list = $("#summary-list");
  const end = new Date(weekStart); end.setDate(end.getDate() + 6);
  $("#week-label").textContent = `${shortDate(weekStart)} to ${shortDate(end)}`;
  status.classList.remove("error");
  status.textContent = "Loading your week…";
  try {
    const data = await api(`/api/sessions?week_start=${iso(weekStart)}`);
    const t = data.totals;
    // Summary cards: sessions, hours trained, and shots made out of shots attempted.
    stats.replaceChildren(
      statCard("Workouts", t.sessions),
      statCard("Hours", (t.minutes / 60).toFixed(1)),
      statCard("Shots made", `${t.shots_made}/${t.shots_attempted}`),
      statCard("Shooting", t.shots_attempted ? `${Math.round(t.shots_made / t.shots_attempted * 100)}%` : "-")
    );
    list.replaceChildren();
    data.sessions.forEach(session => list.append(sessionCard(session)));
    status.textContent = data.sessions.length ? "" : "Nothing logged this week. Build a workout and log your first session.";
  } catch (error) {
    status.classList.add("error");
    status.textContent = errorText(error);
  }
}

// One big-number card for the weekly totals.
function statCard(label, value) {
  const card = element("div", "stat");
  card.append(element("strong", "", String(value)), element("span", "", label));
  return card;
}

// One logged session: its date, name, each drill's result, and a delete button.
function sessionCard(session) {
  const card = element("article", "exercise-card");
  const minutes = session.drills.reduce((sum, d) => sum + d.minutes, 0);
  const del = element("button", "btn small ghost", "Delete");
  del.type = "button";
  del.addEventListener("click", async () => {
    if (!confirm(`Delete "${session.name}"?`)) return;
    try { await api(`/api/sessions/${session.id}`, { method: "DELETE" }); loadSummary(); }
    catch (error) { alert(errorText(error)); }
  });
  card.append(
    element("h3", "", session.name),
    element("p", "exercise-meta", `${fromIso(session.performed_on).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}, ${minutes} min`)
  );
  session.drills.forEach(d => card.append(element("p", "", `${d.title}: ${d.minutes} min, ${shotText(d.shots_made, d.shots_attempted)}`)));
  card.append(del);
  return card;
}

/* ===================================================================
   PAGE 2: WORKOUT BUILDER (create, save, and log full workouts)
==================================================================== */

let draft = [];          // drills in the workout being built: {title, category, minutes, shots}
let builderReady = false;

// Message line under the builder (isError turns it red).
function builderStatus(text, isError = false) {
  const status = $("#builder-status");
  status.classList.toggle("error", isError);
  status.textContent = text;
}

// Fills the category and drill dropdowns from the drill library in app.js.
function setupBuilder() {
  const libraries = CATEGORIES.filter(c => c.drills);          // skips Strength and the two user pages
  const catSelect = $("#drill-cat"), pick = $("#drill-pick");
  libraries.forEach(c => catSelect.append(new Option(c.label, c.id)));
  // When the category changes, list that category's drills.
  const fillDrills = () => {
    const cat = libraries.find(c => c.id === catSelect.value);
    pick.replaceChildren(...cat.drills.map(drill => new Option(drill.title, drill.title)));
  };
  catSelect.addEventListener("change", fillDrills);
  fillDrills();

  // "Add drill" pushes the chosen drill (with planned minutes/shots) onto the draft.
  $("#drill-add").addEventListener("click", () => {
    const cat = libraries.find(c => c.id === catSelect.value);
    const minutes = Number($("#drill-minutes").value), shots = Number($("#drill-shots").value);
    if (!Number.isInteger(minutes) || minutes < 0 || !Number.isInteger(shots) || shots < 0) {
      return builderStatus("Minutes and shots must be whole numbers, 0 or more.", true);
    }
    draft.push({ title: pick.value, category: cat.label, minutes, shots });
    builderStatus("");
    renderDraft();
  });

  // "Save workout" sends the draft to the database.
  $("#builder-save").addEventListener("click", async () => {
    const name = $("#builder-name").value.trim();
    if (!name) return builderStatus("Give your workout a name.", true);
    if (!draft.length) return builderStatus("Add at least one drill.", true);
    try {
      await api("/api/saved-workouts", { method: "POST", body: JSON.stringify({ name, drills: draft }) });
      draft = []; $("#builder-name").value = "";
      renderDraft(); builderStatus(`Saved "${name}".`);
      refreshSaved();
    } catch (error) { builderStatus(errorText(error), true); }
  });
}

// Draws the in-progress workout with a remove button on each drill.
function renderDraft() {
  const box = $("#draft-list");
  box.replaceChildren();
  if (!draft.length) box.append(element("p", "status", "No drills yet. Add some above."));
  draft.forEach((drill, i) => {
    const row = element("div", "draft-row");
    const remove = element("button", "btn small ghost", "Remove");
    remove.type = "button";
    remove.addEventListener("click", () => { draft.splice(i, 1); renderDraft(); });
    row.append(element("span", "", `${drill.title} (${drill.category}): ${drill.minutes} min${drill.shots ? `, ${drill.shots} shots` : ""}`), remove);
    box.append(row);
  });
}

// Loads saved workouts from the backend and draws them with Log / Delete buttons.
async function refreshSaved() {
  const box = $("#saved-list");
  try {
    const { workouts } = await api("/api/saved-workouts");
    box.replaceChildren();
    if (!workouts.length) box.append(element("p", "status", "No saved workouts yet."));
    workouts.forEach(w => {
      const card = element("article", "exercise-card");
      const total = w.drills.reduce((sum, d) => sum + d.minutes, 0);
      const log = element("button", "btn small", "Log a session");
      const del = element("button", "btn small ghost", "Delete");
      log.type = del.type = "button";
      log.addEventListener("click", () => openLog(w));
      del.addEventListener("click", async () => {
        if (!confirm(`Delete "${w.name}"?`)) return;
        try { await api(`/api/saved-workouts/${w.id}`, { method: "DELETE" }); $("#log-panel").hidden = true; refreshSaved(); }
        catch (error) { builderStatus(errorText(error), true); }
      });
      card.append(
        element("h3", "", w.name),
        element("p", "exercise-meta", `${w.drills.length} drills, ${total} min planned`),
        element("p", "", w.drills.map(d => d.title).join(", ")),
        element("div", "actions")
      );
      card.lastChild.append(log, del);
      box.append(card);
    });
  } catch (error) { builderStatus(errorText(error), true); }
}

// Opens the log form for a saved workout: one row per drill to enter results.
function openLog(workout) {
  const panel = $("#log-panel"), rows = [];
  panel.replaceChildren(element("h3", "", `Log "${workout.name}"`));
  const [dateLabel, dateInput] = field("Date", { type: "date", value: iso(new Date()) });
  panel.append(dateLabel);
  workout.drills.forEach(d => {
    // Inputs start at the planned values so the user only edits what changed.
    const row = element("div", "log-row");
    const [m, minutes] = field("Minutes", { type: "number", min: 0, value: d.minutes });
    const [made, shotsMade] = field("Made", { type: "number", min: 0, value: 0 });
    const [att, shotsAtt] = field("Attempted", { type: "number", min: 0, value: d.shots });
    row.append(element("strong", "", d.title), m, made, att);
    panel.append(row);
    rows.push({ d, minutes, shotsMade, shotsAtt });
  });
  const save = element("button", "btn", "Save session");
  save.type = "button";
  save.addEventListener("click", async () => {
    const drills = rows.map(r => ({
      title: r.d.title, category: r.d.category,
      minutes: Number(r.minutes.value), shots_made: Number(r.shotsMade.value), shots_attempted: Number(r.shotsAtt.value)
    }));
    try {
      await api("/api/sessions", { method: "POST", body: JSON.stringify({ name: workout.name, performed_on: dateInput.value, drills }) });
      // Jump to "My week" showing the week that was just logged.
      weekStart = mondayOf(fromIso(dateInput.value));
      state.cat = "summary"; history.replaceState(null, "", "#summary"); render();
    } catch (error) { builderStatus(errorText(error), true); }
  });
  panel.append(save);
  panel.hidden = false;
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Called each time the Builder tab opens.
function loadBuilder() {
  if (!builderReady) { setupBuilder(); builderReady = true; }   // wire up once
  renderDraft();
  refreshSaved();
}

// Called once at startup from app.js: hooks up the week navigation buttons.
function setupTracker() {
  $("#week-prev").addEventListener("click", () => { weekStart.setDate(weekStart.getDate() - 7); loadSummary(); });
  $("#week-next").addEventListener("click", () => { weekStart.setDate(weekStart.getDate() + 7); loadSummary(); });
  $("#week-now").addEventListener("click", () => { weekStart = mondayOf(new Date()); loadSummary(); });
}
