import type { AppState } from "../../state";
import { currentScenario, setTypeIndex } from "../../state";
import { renderCurves } from "../../plots/curves";
import { fmt, setText } from "../format";

export function initTypesTile(): void {
  document.getElementById("type-select")?.addEventListener("change", (e) => {
    setTypeIndex(Number((e.target as HTMLSelectElement).value));
  });
}

export function updateTypesTile(state: AppState): void {
  const sc = currentScenario(state);
  if (!sc || sc.turbineTypes.length === 0) return;

  const select = document.getElementById("type-select") as HTMLSelectElement | null;
  if (select) {
    if (select.options.length !== sc.turbineTypes.length) {
      select.innerHTML = "";
      sc.turbineTypes.forEach((tt, i) => {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = tt.name;
        select.appendChild(opt);
      });
    }
    select.value = String(state.typeIndex);
  }

  const tt = sc.turbineTypes[Math.min(state.typeIndex, sc.turbineTypes.length - 1)];
  if (!tt) return;

  const inUse = sc.turbines.filter((t) => t.type === tt.name).length;
  setText("type-cap", tt.capacityKw !== null ? `${fmt(tt.capacityKw, 0)} kW` : "—");
  setText("type-rotor", tt.diameter !== null ? `${fmt(tt.diameter, 1)} m` : "—");
  setText("type-cut", tt.cutIn !== null && tt.cutOut !== null ? `${fmt(tt.cutIn, 1)} / ${fmt(tt.cutOut, 1)} m/s` : "—");
  setText("type-used", inUse > 0 ? `${inUse}` : "0");

  const specsEl = document.getElementById("type-specs");
  if (specsEl) {
    specsEl.innerHTML = "";
    for (const kv of tt.specs) {
      const dt = document.createElement("dt");
      dt.textContent = kv.key;
      const dd = document.createElement("dd");
      dd.textContent = kv.value;
      specsEl.append(dt, dd);
    }
    for (const note of tt.comments) {
      const dd = document.createElement("dd");
      dd.className = "note";
      dd.textContent = note;
      specsEl.append(dd);
    }
  }

  const plotEl = document.getElementById("curves-plot");
  if (plotEl) {
    if (tt.power || tt.thrust) {
      const { density } = renderCurves(plotEl, tt);
      setText("curves-density", density !== null ? `@ ρ = ${density} kg/m³` : "");
    } else {
      plotEl.textContent = "No power/thrust curve in this report.";
    }
  }
}
