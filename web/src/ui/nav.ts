import type { AppState } from "../state";
import { setProjectSite, setScenarioIndex } from "../state";

export function initNav(): void {
  // Scroll-spy: highlight the last section whose top passed 30% of the viewport
  const nav = document.getElementById("section-nav")!;
  const links = [...nav.querySelectorAll<HTMLAnchorElement>("a[href^='#']")];
  const sections = links
    .map((a) => document.querySelector<HTMLElement>(a.getAttribute("href")!))
    .filter((s): s is HTMLElement => s !== null);

  const updateActive = () => {
    const probe = window.scrollY + window.innerHeight * 0.3;
    let active = sections[0];
    for (const s of sections) {
      if (!s.hidden && s.offsetTop <= probe) active = s;
    }
    links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${active.id}`));
  };
  window.addEventListener("scroll", updateActive, { passive: true });
  window.addEventListener("resize", updateActive, { passive: true });

  document.getElementById("sheet-picker")?.addEventListener("change", (e) => {
    setScenarioIndex(Number((e.target as HTMLSelectElement).value));
  });

  document.getElementById("project-picker")?.addEventListener("change", (e) => {
    setProjectSite((e.target as HTMLSelectElement).value);
  });
}

export function updateNav(state: AppState): void {
  const nav = document.getElementById("section-nav")!;
  nav.hidden = !state.workbook;

  const filenameEl = document.getElementById("loaded-filename");
  if (filenameEl) filenameEl.textContent = state.workbook ? state.filename : "";

  const wrap = document.getElementById("sheet-picker-wrap")!;
  const picker = document.getElementById("sheet-picker") as HTMLSelectElement;
  const scenarios = state.workbook?.scenarios ?? [];
  if (scenarios.length > 1) {
    wrap.hidden = false;
    if (picker.options.length !== scenarios.length) {
      picker.innerHTML = "";
      scenarios.forEach((sc, i) => {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = sc.sheetName;
        picker.appendChild(opt);
      });
    }
    picker.value = String(state.scenarioIndex);
  } else {
    wrap.hidden = true;
  }

  // Project picker: list the detailed sites of the current scenario (+ All sites)
  const sc = scenarios[state.scenarioIndex];
  const projWrap = document.getElementById("project-picker-wrap")!;
  const projPicker = document.getElementById("project-picker") as HTMLSelectElement;
  const siteNames = sc?.sites.map((s) => s.name) ?? [];
  if (sc && siteNames.length > 1) {
    projWrap.hidden = false;
    const wanted = ["", ...siteNames];
    const have = [...projPicker.options].map((o) => o.value);
    if (wanted.join("|") !== have.join("|")) {
      projPicker.innerHTML = "";
      for (const name of wanted) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name === "" ? "All sites" : name;
        projPicker.appendChild(opt);
      }
    }
    projPicker.value = state.projectSite;
  } else {
    projWrap.hidden = true;
  }

  // Compare section: only when there is more than one scenario to compare
  const multi = scenarios.length > 1;
  toggleSection("sec-compare", multi);
  const navCompare = nav.querySelector("a[href='#sec-compare']") as HTMLElement | null;
  if (navCompare) navCompare.hidden = !multi;

  // Hide sections that have no content for this scenario
  toggleSection("sec-types", !!sc && sc.turbineTypes.length > 0);
  toggleSection("sec-masts", !!sc && sc.masts.length > 0);
  const navTypes = nav.querySelector("a[href='#sec-types']") as HTMLElement | null;
  if (navTypes) navTypes.hidden = !sc || sc.turbineTypes.length === 0;
  const navMasts = nav.querySelector("a[href='#sec-masts']") as HTMLElement | null;
  if (navMasts) navMasts.hidden = !sc || sc.masts.length === 0;
}

function toggleSection(id: string, show: boolean): void {
  const el = document.getElementById(id);
  if (el) el.hidden = !show;
}
