/* ===================================================================
   tracker.js: the two user pages ("My week" and "Workout builder").
   Loaded BEFORE app.js in index.html. It reuses helpers from app.js
   ($, element, CATEGORIES, state, render, API_BASE).
==================================================================== */

const WEEK_GOAL = 5;   // workouts per week that fill the progress ring (change to taste)

/* ---------- Identity + API helper ---------- */

function userId() {
  let id = localStorage.getItem("trainingUserId");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("trainingUserId", id); }
  return id;
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", "X-User-Id": userId() }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

const errorText = error => error instanceof TypeError
  ? "Cannot reach the backend. It may be waking up, so try again in a few seconds."
  : error.message;

/* ---------- Date + display helpers ---------- */

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = s => new Date(`${s}T00:00:00`);
function mondayOf(d) { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
const shortDate = d => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const pct = (made, att) => att ? Math.round(made / att * 100) : 0;

function field(text, attrs) {
  const label = element("label", "", text);
  const input = Object.assign(document.createElement("input"), attrs);
  label.append(input);
  return [label, input];
}

// The orange only ever shows up on basketballs: this reuses the <g id="ball"> from index.html.
const BALL = '<svg class="ball-icon" viewBox="-12 -12 24 24" aria-hidden="true"><use href="#ball"/></svg>';

// Progress ring with a basketball riding the tip of the arc. p is 0 to 1.
function ring(p, big, small) {
  const R = 48, C = 2 * Math.PI * R;
  p = Math.max(0, Math.min(1, p));
  const a = p * 2 * Math.PI - Math.PI / 2;
  const ball = p > 0 ? `<use href="#ball" transform="translate(${60 + R * Math.cos(a)} ${60 + R * Math.sin(a)}) scale(.95)"/>` : "";
  const box = element("div", "ring");
  box.innerHTML =
    `<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="${R}"/>` +
    `<circle class="ring-fill" cx="60" cy="60" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}" transform="rotate(-90 60 60)"/>${ball}</svg>` +
    `<div class="ring-text"><strong></strong><span></span></div>`;
  box.querySelector("strong").textContent = big;
  box.querySelector("span").textContent = small;
  return box;
}

/* ===================================================================
   PAGE 1: MY WEEK (dashboard)
==================================================================== */

let weekStart = mondayOf(new Date());

const iconFor = label => (CATEGORIES.find(c => c.label === label) || {}).icon || "🏀";
const hm = m => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
const getWeek = start => api(`/api/sessions?week_start=${iso(start)}`);

// Icon tile + label + value + progress bar (frac is 0 to 1). Pass "" for no icon.
function metric(icon, label, value, frac) {
  const row = element("div", "metric"), ico = element("div", "m-ico"), mid = element("div", "m-mid"), top = element("div", "m-top"), bar = element("i");
  ico.innerHTML = icon;
  bar.style.setProperty("--w", `${Math.round(frac * 100)}%`);
  top.append(element("span", "", label), element("b", "", value));
  mid.append(top, bar);
  row.append(ico, mid);
  return row;
}

// Rounded card with a heading and a small tag on the right.
function statCard(title, tag, ...content) {
  const card = element("section", "stat-card"), head = element("div", "stat-head");
  head.append(element("h3", "", title), element("span", "tag", tag));
  card.append(head, ...content);
  return card;
}

async function loadSummary() {
  const status = $("#summary-status"), main = $("#summary-stats"), side = $("#summary-side");
  const end = new Date(weekStart); end.setDate(end.getDate() + 6);
  $("#week-label").textContent = `${shortDate(weekStart)} to ${shortDate(end)}`;
  $("#week-now").className = iso(weekStart) === iso(mondayOf(new Date())) ? "btn small ghost" : "btn small";
  status.classList.remove("error");
  status.textContent = "Loading your week…";
  try {
    const data = await getWeek(weekStart), t = data.totals;
    const sessions = [...data.sessions].sort((a, b) => b.performed_on.localeCompare(a.performed_on));

    // Total time vs last week (skipped quietly if that request fails or last week was empty).
    let delta = "";
    try {
      const prev = new Date(weekStart); prev.setDate(prev.getDate() - 7);
      const before = (await getWeek(prev)).totals.minutes;
      if (before > 0) { const c = Math.round((t.minutes - before) / before * 100); delta = `${c >= 0 ? "↗ +" : "↘ "}${c}% vs last week`; }
    } catch (e) { /* ignore */ }

    // THIS WEEK: ring + how many sessions included each skill.
    const catCount = {};
    sessions.forEach(s => new Set(s.drills.map(d => d.category)).forEach(c => { catCount[c] = (catCount[c] || 0) + 1; }));
    const cats = element("div", "metrics");
    const names = Object.keys(catCount).sort((a, b) => catCount[b] - catCount[a]);
    if (!names.length) cats.append(element("p", "status", "No skills logged yet."));
    names.forEach(n => cats.append(metric(iconFor(n), n, `${catCount[n]}/${sessions.length}`, catCount[n] / sessions.length)));
    const total = element("div", "total");
    total.append(element("span", "", "Total training time"), element("strong", "", hm(t.minutes)), element("small", "", delta));
    const week = element("div", "stat-body");
    const right = element("div", "grow"); right.append(cats, total);
    week.append(ring(t.sessions / WEEK_GOAL, `${t.sessions}/${WEEK_GOAL}`, "Workouts"), right);

    // RECENT SESSIONS
    const recent = element("div", "sess-list");
    sessions.forEach(s => recent.append(sessionCard(s)));
    if (!sessions.length) recent.append(element("p", "status", "Nothing logged this week. Build a workout and log your first session."));

    // SHOOTING: ring + best-attempted drills
    const byDrill = {};
    sessions.forEach(s => s.drills.forEach(d => {
      if (!d.shots_attempted) return;
      const x = byDrill[d.title] || (byDrill[d.title] = { made: 0, att: 0 });
      x.made += d.shots_made; x.att += d.shots_attempted;
    }));
    const shootRows = element("div", "metrics");
    Object.entries(byDrill).sort((a, b) => b[1].att - a[1].att).slice(0, 3)
      .forEach(([n, x]) => shootRows.append(metric("", n, `${pct(x.made, x.att)}%`, x.made / x.att)));
    if (!t.shots_attempted) shootRows.append(element("p", "status", "No shots logged yet."));
    const shoot = element("div", "stat-body");
    const shootRight = element("div", "grow"); shootRight.append(shootRows, element("small", "shots-line", `${t.shots_made} made of ${t.shots_attempted} shots`));
    shoot.append(ring(t.shots_attempted ? t.shots_made / t.shots_attempted : 0, t.shots_attempted ? `${pct(t.shots_made, t.shots_attempted)}%` : "-", "Accuracy"), shootRight);

    // YOUR WEEK: a tile per day, checked if a session was logged that date
    const logged = new Set(sessions.map(s => s.performed_on));
    const days = element("div", "days");
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart); day.setDate(day.getDate() + i);
      const cell = element("div", "day"), check = element("span", "check", logged.has(iso(day)) ? "✓" : "");
      if (logged.has(iso(day))) cell.classList.add("done");
      if (iso(day) === iso(new Date())) cell.classList.add("today");
      cell.append(element("span", "", day.toLocaleDateString(undefined, { weekday: "short" })), element("strong", "", String(day.getDate())), check);
      days.append(cell);
    }
    const latest = element("div", "focus");
    if (sessions[0]) {
      latest.append(element("small", "", "Latest session"), element("h4", "", sessions[0].name));
      sessions[0].drills.forEach(d => { const li = element("p", "", d.title); li.prepend(element("span", "check on", "✓")); latest.append(li); });
    } else latest.append(element("small", "", "Latest session"), element("p", "status", "Nothing yet."));

    main.replaceChildren(statCard("This Week", "Workouts", week), statCard("Recent Sessions", `${sessions.length} logged`, recent));
    side.replaceChildren(statCard("Shooting", "This week", shoot), statCard("Your Week", "Mon to Sun", days, latest));
    status.textContent = "";
  } catch (error) {
    status.classList.add("error");
    status.textContent = errorText(error);
  }
}

// One logged session as a rounded row: date, ball icon, name + drills, totals, delete.
function sessionCard(session) {
  const row = element("article", "sess");
  const date = fromIso(session.performed_on);
  const minutes = session.drills.reduce((n, d) => n + d.minutes, 0);
  const made = session.drills.reduce((n, d) => n + d.shots_made, 0);
  const att = session.drills.reduce((n, d) => n + d.shots_attempted, 0);
  const when = element("div", "sess-date");
  when.append(element("span", "", date.toLocaleDateString(undefined, { month: "short" })), element("strong", "", String(date.getDate())));
  const icon = element("div", "sess-ico");
  icon.innerHTML = BALL;
  const body = element("div", "sess-body");
  body.append(element("h4", "", session.name), element("p", "", session.drills.map(d =>
    `${d.title} ${d.minutes}m${d.shots_attempted ? ` (${d.shots_made}/${d.shots_attempted})` : ""}`).join("  ·  ")));
  const del = element("button", "btn small ghost", "Delete");
  del.type = "button";
  del.addEventListener("click", async () => {
    if (!confirm(`Delete "${session.name}"?`)) return;
    try { await api(`/api/sessions/${session.id}`, { method: "DELETE" }); loadSummary(); }
    catch (error) { alert(errorText(error)); }
  });
  const totals = element("div");
  totals.append(element("strong", "", hm(minutes)), element("span", "", att ? `${pct(made, att)}% FG` : "no shots"));
  const side = element("div", "sess-side");
  side.append(totals, del);
  row.append(when, icon, body, side);
  return row;
}

/* ===================================================================
   PAGE 2: WORKOUT BUILDER (create, save, and log full workouts)
==================================================================== */

let draft = [];          // {title, category, minutes, shots}
let builderReady = false;

function builderStatus(text, isError = false) {
  const status = $("#builder-status");
  status.classList.toggle("error", isError);
  status.textContent = text;
}

function setupBuilder() {
  const libraries = CATEGORIES.filter(c => c.drills);
  const catSelect = $("#drill-cat"), pick = $("#drill-pick");
  libraries.forEach(c => catSelect.append(new Option(c.label, c.id)));
  const fillDrills = () => {
    const cat = libraries.find(c => c.id === catSelect.value);
    pick.replaceChildren(...cat.drills.map(drill => new Option(drill.title, drill.title)));
  };
  catSelect.addEventListener("change", fillDrills);
  fillDrills();

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

// The in-progress workout, with a running total in the card header.
function renderDraft() {
  const box = $("#draft-list");
  box.replaceChildren();
  const mins = draft.reduce((n, x) => n + x.minutes, 0), shots = draft.reduce((n, x) => n + x.shots, 0);
  $("#draft-total").textContent = draft.length ? `${draft.length} drills · ${mins} min${shots ? ` · ${shots} shots` : ""}` : "";
  if (!draft.length) box.append(element("p", "status", "No drills yet. Pick one on the left."));
  draft.forEach((drill, i) => {
    const row = element("div", "draft-row");
    const text = element("span", "", drill.title);
    text.append(element("small", "", `${drill.category} · ${drill.minutes} min${drill.shots ? ` · ${drill.shots} shots` : ""}`));
    const remove = element("button", "btn small ghost", "Remove");
    remove.type = "button";
    remove.addEventListener("click", () => { draft.splice(i, 1); renderDraft(); });
    row.append(text, remove);
    box.append(row);
  });
}

// Saved workouts as cards with a drill chip list and Log / Delete buttons.
async function refreshSaved() {
  const box = $("#saved-list");
  try {
    const { workouts } = await api("/api/saved-workouts");
    box.replaceChildren();
    if (!workouts.length) box.append(element("p", "status", "No saved workouts yet."));
    workouts.forEach(w => {
      const card = element("article", "saved");
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
      const chips = element("div", "chips");
      w.drills.forEach(d => chips.append(element("span", "chip", d.title)));
      const actions = element("div", "actions");
      actions.append(log, del);
      card.append(element("h4", "", w.name), element("p", "exercise-meta", `${w.drills.length} drills · ${total} min planned`), chips, actions);
      box.append(card);
    });
  } catch (error) { builderStatus(errorText(error), true); }
}

// Log form for a saved workout: one row per drill, starting at the planned values.
function openLog(workout) {
  const panel = $("#log-panel"), rows = [];
  panel.replaceChildren(element("h3", "", `Log "${workout.name}"`));
  const [dateLabel, dateInput] = field("Date", { type: "date", value: iso(new Date()) });
  panel.append(dateLabel);
  workout.drills.forEach(d => {
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
      weekStart = mondayOf(fromIso(dateInput.value));
      state.cat = "summary"; history.replaceState(null, "", "#summary"); render();
    } catch (error) { builderStatus(errorText(error), true); }
  });
  panel.append(save);
  panel.hidden = false;
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function loadBuilder() {
  if (!builderReady) { setupBuilder(); builderReady = true; }
  renderDraft();
  refreshSaved();
}

function setupTracker() {
  $("#week-prev").addEventListener("click", () => { weekStart.setDate(weekStart.getDate() - 7); loadSummary(); });
  $("#week-next").addEventListener("click", () => { weekStart.setDate(weekStart.getDate() + 7); loadSummary(); });
  $("#week-now").addEventListener("click", () => { weekStart = mondayOf(new Date()); loadSummary(); });
}
