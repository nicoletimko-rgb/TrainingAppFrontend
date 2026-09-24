// Change this to your public Render URL before publishing on GitHub Pages.
// During local testing leave it as localhost (backend runs on port 5000).
const API_BASE = "https://trainingappbackend.onrender.com/";

const form = document.querySelector("#workout-form");
const status = document.querySelector("#status");
const result = document.querySelector("#result");
const button = document.querySelector("#submit");

function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
}

function renderWorkout(plan) {
  result.replaceChildren();
  const top = element("div", "result-top");
  const title = element("div");
  title.append(element("p", "eyebrow", "02 / YOUR CUSTOM SESSION"), element("h2", "", plan.title));
  top.append(title, element("span", "duration", `${plan.total_minutes} MIN / ${plan.level.toUpperCase()}`));
  result.append(top);

  for (const section of plan.sections) {
    const card = element("div", "section-card");
    card.append(element("h3", "", `${section.name} · ${section.minutes} min`));
    if (section.instruction) card.append(element("p", "", section.instruction));
    if (section.drills) section.drills.forEach((drill, index) => {
      const row = element("div", "drill");
      const detail = element("div");
      detail.append(element("h4", "", drill.name), element("p", "", drill.instruction));
      row.append(element("span", "number", String(index + 1).padStart(2, "0")), detail, element("span", "time", `${drill.minutes} MIN`));
      card.append(row);
    });
    result.append(card);
  }
  result.append(element("p", "coach-note", `COACH'S NOTE  ${plan.coach_note}`));
  result.hidden = false;
  result.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const goal = document.querySelector("#goal").value;
  if (!goal) {
    status.textContent = "Choose a training goal first.";
    status.classList.add("error");
    document.querySelector("#goal").focus();
    return;
  }
  status.classList.remove("error");
  status.textContent = "Building your session…";
  button.disabled = true;
  try {
    const response = await fetch(`${API_BASE}/api/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal,
        minutes: Number(document.querySelector("#minutes").value),
        level: document.querySelector("#level").value,
        space: document.querySelector("#space").value,
        equipment: [...document.querySelectorAll('input[name="equipment"]:checked')].map(item => item.value)
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not build your workout.");
    renderWorkout(data);
    status.textContent = "Your session is ready.";
  } catch (error) {
    status.classList.add("error");
    status.textContent = error instanceof TypeError
      ? "Cannot reach the backend. Check its URL or try again shortly."
      : error.message;
  } finally {
    button.disabled = false;
  }
});

const exerciseForm = document.querySelector("#exercise-form");
const exerciseStatus = document.querySelector("#exercise-status");
const exerciseResults = document.querySelector("#exercise-results");
const exerciseButton = document.querySelector("#exercise-submit");

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
      body: JSON.stringify({
        focus: document.querySelector("#focus").value,
        level: document.querySelector("#exercise-level").value
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not find exercises.");
    exerciseResults.replaceChildren();
    exerciseResults.append(element("p", "eyebrow", `EXERCISES FROM ${data.source.toUpperCase()}`));
    if (!data.exercises.length) {
      exerciseResults.append(element("p", "", "No matches this time. Try another focus or difficulty."));
    } else data.exercises.forEach((item, index) => {
      const card = element("article", "exercise-card");
      card.append(element("span", "number", String(index + 1).padStart(2, "0")), element("h3", "", item.name));
      card.append(element("p", "exercise-meta", `${item.muscle} · ${item.difficulty} · Equipment: ${item.equipment.join(", ") || "none listed"}`));
      card.append(element("p", "", item.instructions));
      if (item.safety_info) card.append(element("p", "safety", `Form tip: ${item.safety_info}`));
      exerciseResults.append(card);
    });
    exerciseResults.hidden = false;
    exerciseStatus.textContent = `${data.exercises.length} exercises found.`;
  } catch (error) {
    exerciseStatus.classList.add("error");
    exerciseStatus.textContent = error instanceof TypeError
      ? "Cannot reach the backend. Check its URL or try again shortly."
      : error.message;
  } finally {
    exerciseButton.disabled = false;
  }
});
