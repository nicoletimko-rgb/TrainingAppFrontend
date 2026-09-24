// Your Render backend URL (only used for the Strength section).
const API_BASE = "https://trainingappbackend.onrender.com".replace(/\/+$/, "");

/* ------------------------------------------------------------------
   COURT SPOTS: positions on the half court diagram (x, y, name).
   Use these names in a drill's "spots" list. The ball travels between
   them in the order you list them.
------------------------------------------------------------------- */
const SPOTS = {
  cornerL: [40, 40, "Left corner"],   cornerR: [460, 40, "Right corner"],
  wingL:   [82, 220, "Left wing"],    wingR:   [418, 220, "Right wing"],
  top:     [250, 282, "Top of the key"],
  ft:      [250, 190, "Free throw line"],
  elbowL:  [190, 190, "Left elbow"],  elbowR:  [310, 190, "Right elbow"],
  blockL:  [200, 45, "Left block"],   blockR:  [300, 45, "Right block"],
  rim:     [250, 100, "Close to the rim"],
};

/* ------------------------------------------------------------------
   DRILL LIBRARY: the only place Erik needs to edit.

   d(title, level, description, spots, video)
     level:  "beginner" | "intermediate" | "advanced"
     spots:  court spots for the animated diagram, or [] for none
     video:  "" until it is filmed. Then paste a direct .mp4/.mov/.webm link,
             or an embed link (YouTube: youtube.com/embed/ID,
             Instagram reel: instagram.com/reel/CODE/embed)
------------------------------------------------------------------- */
const d = (title, level, desc, spots = [], video = "") => ({ title, level, desc, spots, video });

const CATEGORIES = [
  {
    id: "shooting", label: "Shooting", icon: "🎯",
    blurb: "Build a shot that holds up in games. Start with form, then add speed and movement.",
    drills: [
      d("Five spot shooting", "beginner", "Five spots around the arc. Make three at each spot before you move on.", ["cornerL", "wingL", "top", "wingR", "cornerR"]),
      d("Form shooting", "beginner", "One hand, close to the rim. Elbow under the ball, follow through, hold your finish.", ["rim"]),
      d("Free throw routine", "beginner", "Same routine every time. Breathe, bounce, shoot. Try to make ten in a row.", ["ft"]),
      d("Catch and shoot", "intermediate", "Feet ready before the ball arrives. Catch, set, and shoot in one smooth motion.", ["cornerL", "wingL", "wingR", "cornerR"]),
      d("Elbow pull-ups", "advanced", "Attack one dribble, stop on balance, and rise straight up into your shot.", ["elbowL", "elbowR"]),
    ],
  },
  {
    id: "handling", label: "Ball handling", icon: "🏀",
    blurb: "Tight handle, head up. Get comfortable with the ball in either hand.",
    drills: [
      d("Stationary pound dribbles", "beginner", "Pound the ball hard at knee height, then waist height. Eyes up, both hands."),
      d("Figure eights", "beginner", "Weave the ball around and between your legs without losing control."),
      d("Two-ball dribbling", "intermediate", "Dribble two balls together, then alternate. Builds weak-hand strength."),
      d("Crossover series", "intermediate", "Low, quick crossovers. Sell it with your shoulders and explode out of it."),
      d("Change of pace", "advanced", "Go slow, then explode. Learn to use speed to beat the defender."),
    ],
  },
  {
    id: "finishing", label: "Finishing", icon: "🔥",
    blurb: "Get the ball in the basket through contact and off both feet.",
    drills: [
      d("Mikan drill", "beginner", "Alternate layups on each side of the rim without letting the ball hit the floor.", ["blockL", "blockR"]),
      d("Reverse layups", "intermediate", "Use the backboard and the rim to protect the ball from the defender.", ["blockR", "blockL"]),
      d("Euro step", "intermediate", "Two big steps in opposite directions to get around a defender.", ["elbowR", "blockL"]),
      d("Floaters", "advanced", "Soft touch over the big man. Go off one foot and let it float.", ["elbowL", "elbowR"]),
    ],
  },
  {
    id: "defense", label: "Defense", icon: "🛡️",
    blurb: "Stay low, stay in front, and compete every possession.",
    drills: [
      d("Defensive slides", "beginner", "Low stance, hips down, don't cross your feet. Slide baseline to baseline."),
      d("Closeouts", "beginner", "Sprint, chop your feet, hand up. Arrive under control."),
      d("Mirror drill", "intermediate", "Stay in front of a partner as they change direction."),
      d("Deflections", "advanced", "Get your hands active in the passing lanes without reaching."),
    ],
  },
  {
    id: "conditioning", label: "Conditioning", icon: "⚡",
    blurb: "Be the player who is still going strong in the fourth quarter.",
    drills: [
      d("Jump rope", "beginner", "Light on your toes, quick hands. Great for footwork and stamina."),
      d("Line sprints", "intermediate", "Baseline to free throw line and back, then half court, then full court."),
      d("17s", "advanced", "Sideline to sideline 17 times in one minute. Rest, then repeat."),
    ],
  },
  {
    id: "strength", label: "Strength", icon: "💪", api: true,
    blurb: "Get stronger off the court. These exercises come from our exercise library.",
  },
];

const LEVELS = ["all", "beginner", "intermediate", "advanced"];
const state = { cat: "shooting", level: "all" };
const $ = selector => document.querySelector(selector);
const cap = s => s[0].toUpperCase() + s.slice(1);

function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
}

/* ---------- Court diagram (used for tile thumbnails and the animated view) ---------- */
const LINES = '<path d="M0 320V0H500V320"/><rect x="170" y="0" width="160" height="190"/>' +
  '<path d="M190 190A60 60 0 0 0 310 190" stroke-dasharray="6 6"/><path d="M190 190A60 60 0 0 1 310 190"/>' +
  '<path d="M220 40H280"/><path d="M210 52.5A40 40 0 0 0 290 52.5"/><path d="M30 0V142A237.5 237.5 0 0 0 470 142V0"/>';

function courtSVG(keys, live) {
  const scale = live ? 1 : 2.2, ring = live ? 21 : 30;
  const spots = keys.map((key, i) => {
    const [x, y] = SPOTS[key];
    const num = live && keys.length > 1 ? `<text y="-27">${i + 1}</text>` : "";
    return `<g class="spot" transform="translate(${x} ${y})"><circle class="ring" r="${ring}"/><use href="#ball" transform="scale(${scale})"/>${num}</g>`;
  }).join("");
  const runner = live
    ? '<line class="shot" x1="250" y1="52" x2="250" y2="52"/><g class="runner"><use href="#ball" transform="scale(1.4)"/></g>'
    : "";
  return `<svg class="court" viewBox="-8 -8 516 336" role="img" aria-label="Half court diagram"><g class="lines">${LINES}</g>` +
    `<circle class="hoop" cx="250" cy="52.5" r="9"/>${spots}${runner}</svg>`;
}

/* Animates the ball spot to spot, then fires a shot at the hoop from each spot */
function startCourt(keys) {
  const svg = $("#court-box svg");
  const runner = svg.querySelector(".runner"), shot = svg.querySelector(".shot"), hoop = svg.querySelector(".hoop");
  const spots = [...svg.querySelectorAll(".spot")];
  const label = $("#court-label"), toggle = $("#court-toggle");
  let i = 0, timer = 0, playing = false;

  const restart = (node, cls) => { node.classList.remove(cls); void node.getBoundingClientRect(); node.classList.add(cls); };
  const place = animate => {
    const [x, y, name] = SPOTS[keys[i]];
    runner.style.transition = animate ? "" : "none";
    runner.style.transform = `translate(${x}px, ${y}px)`;
    label.textContent = keys.length > 1 ? `${i + 1} of ${keys.length}: ${name}` : name;
    spots.forEach((s, n) => s.classList.toggle("active", n === i));
    return [x, y];
  };
  const cycle = animate => {
    const [x, y] = place(animate);
    timer = setTimeout(() => {
      shot.setAttribute("x1", x); shot.setAttribute("y1", y);
      restart(shot, "fire"); restart(hoop, "flash");
      timer = setTimeout(() => { i = (i + 1) % keys.length; cycle(true); }, 1000);
    }, animate && keys.length > 1 ? 800 : 250);
  };
  const play = () => { playing = true; toggle.textContent = "Pause"; cycle(false); };
  const pause = () => { playing = false; toggle.textContent = "Play"; clearTimeout(timer); };
  toggle.onclick = () => (playing ? pause() : play());

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { place(false); pause(); } else play();
  return pause;
}

/* ---------- Tabs, level filter, grid ---------- */
const currentCategory = () => CATEGORIES.find(c => c.id === state.cat);

function renderTabs() {
  const wrap = $("#tabs-in");
  wrap.replaceChildren();
  CATEGORIES.forEach(cat => {
    const tab = element("button", "tab", cat.label);
    tab.type = "button";
    tab.setAttribute("aria-selected", String(cat.id === state.cat));
    tab.addEventListener("click", () => { state.cat = cat.id; history.replaceState(null, "", "#" + cat.id); render(); });
    wrap.append(tab);
  });
}

function renderLevels() {
  const wrap = $("#levels");
  wrap.replaceChildren();
  LEVELS.forEach(level => {
    const button = element("button", "lvl", level === "all" ? "All levels" : cap(level));
    button.type = "button";
    button.setAttribute("aria-pressed", String(state.level === level));
    button.addEventListener("click", () => { state.level = level; render(); });
    wrap.append(button);
  });
}

const PLAY = '<svg class="play" viewBox="0 0 24 24" aria-label="Video available"><path d="M4 3h16v14l-4 4H4z" fill="#f47b32"/><path d="M9.5 7.5l6 3.5-6 3.5z" fill="#0a1130"/></svg>';

function renderGrid(cat) {
  const grid = $("#grid");
  grid.replaceChildren();
  const drills = cat.drills.filter(x => state.level === "all" || x.level === state.level);
  if (!drills.length) grid.append(element("p", "empty", "No drills at this level yet. Try another level."));
  drills.forEach(drill => {
    const rank = LEVELS.indexOf(drill.level);
    const meter = [1, 2, 3].map(n => `<i class="${n <= rank ? "on" : ""}"></i>`).join("");
    const tile = element("button", "tile");
    tile.type = "button";
    tile.innerHTML =
      `<div class="tile-art">${drill.spots.length ? courtSVG(drill.spots, false) : PLAY}</div>` +
      `<div class="tile-text"><span class="tile-title"></span>` +
      `<span class="tile-foot"><span><span class="meter" aria-hidden="true">${meter}</span>${cap(drill.level)}</span>` +
      `${drill.video ? PLAY : '<span class="soon">Video soon</span>'}</span></div>`;
    tile.querySelector(".tile-title").textContent = drill.title;
    tile.addEventListener("click", () => openDrill(drill, cat));
    grid.append(tile);
  });
}

/* ---------- Drill viewer ---------- */
const viewer = $("#viewer");
let stopCourt = () => {};

function buildMedia(url) {
  if (!url) {
    const box = element("div", "placeholder");
    box.append(element("div", "big", "▶"), element("p", "", "Video coming soon"));
    return box;
  }
  if (/\.(mp4|mov|webm)(\?|$)/i.test(url)) {
    const video = document.createElement("video");
    Object.assign(video, { src: url, controls: true, playsInline: true, preload: "metadata" });
    return video;
  }
  const frame = document.createElement("iframe");
  Object.assign(frame, { src: url, title: "Drill video", allowFullscreen: true, loading: "lazy" });
  return frame;
}

function openDrill(drill, cat) {
  $("#media").replaceChildren(buildMedia(drill.video));
  $("#viewer-meta").textContent = `${cat.label}, ${drill.level}`;
  $("#viewer-title").textContent = drill.title;
  $("#viewer-desc").textContent = drill.desc;
  const hasCourt = drill.spots.length > 0;
  $("#court-wrap").hidden = !hasCourt;
  $("#court-box").innerHTML = hasCourt ? courtSVG(drill.spots, true) : "";
  viewer.showModal();
  if (hasCourt) stopCourt = startCourt(drill.spots);
}

$("#viewer-close").addEventListener("click", () => viewer.close());
viewer.addEventListener("click", event => { if (event.target === viewer) viewer.close(); });
viewer.addEventListener("close", () => { stopCourt(); $("#media").replaceChildren(); }); // stops video and animation

function render() {
  const cat = currentCategory();
  renderTabs();
  $("#title").textContent = cat.label;
  $("#blurb").textContent = cat.blurb;
  $("#levels").hidden = !!cat.api;
  $("#grid").hidden = !!cat.api;
  $("#strength").hidden = !cat.api;
  if (!cat.api) { renderLevels(); renderGrid(cat); }
}

/* ---------- Strength library (backend) ---------- */
const exerciseForm = $("#exercise-form");
const exerciseStatus = $("#exercise-status");
const exerciseResults = $("#exercise-results");
const exerciseButton = $("#exercise-submit");

exerciseForm.addEventListener("submit", async event => {
  event.preventDefault();
  exerciseStatus.classList.remove("error");
  exerciseStatus.textContent = "Looking up exercises…";
  exerciseButton.disabled = true;
  exerciseResults.hidden = true;
  try {
    const response = await fetch(`${API_BASE}/api/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ focus: $("#focus").value, level: $("#exercise-level").value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not find exercises.");
    exerciseResults.replaceChildren();
    if (!data.exercises.length) {
      exerciseResults.append(element("p", "status", "No matches this time. Try another focus or difficulty."));
    } else {
      data.exercises.forEach(item => {
        const card = element("article", "exercise-card");
        card.append(
          element("h3", "", item.name),
          element("p", "exercise-meta", `${item.muscle}, ${item.difficulty}. Equipment: ${item.equipment.join(", ") || "none listed"}`),
          element("p", "", item.instructions)
        );
        if (item.safety_info) card.append(element("p", "safety", `Form tip: ${item.safety_info}`));
        exerciseResults.append(card);
      });
    }
    exerciseResults.hidden = false;
    exerciseStatus.textContent = `${data.exercises.length} exercises found.`;
  } catch (error) {
    exerciseStatus.classList.add("error");
    exerciseStatus.textContent = error instanceof TypeError
      ? "Cannot reach the backend. It may be waking up, so try again in a few seconds."
      : error.message;
  } finally {
    exerciseButton.disabled = false;
  }
});

/* ---------- Start ---------- */
const fromHash = location.hash.slice(1);
if (CATEGORIES.some(c => c.id === fromHash)) state.cat = fromHash; // shareable links like site.com/#shooting
render();
