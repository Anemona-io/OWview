import type { AppState } from "../../state";
import { currentScenario, setMastIndex } from "../../state";
import { overallMeanSpeed, tiCurve } from "../../derive";
import { renderRose } from "../../plots/rose";
import { renderHeatmap } from "../../plots/heatmap";
import { renderTiPlot } from "../../plots/ti";
import { kvStr } from "../../parse/grid";
import { fmt, setText } from "../format";

export function initMastsTile(): void {
  document.getElementById("mast-select")?.addEventListener("change", (e) => {
    setMastIndex(Number((e.target as HTMLSelectElement).value));
  });
}

export function updateMastsTile(state: AppState): void {
  const sc = currentScenario(state);
  if (!sc || sc.masts.length === 0) return;

  const select = document.getElementById("mast-select") as HTMLSelectElement | null;
  if (select) {
    if (select.options.length !== sc.masts.length) {
      select.innerHTML = "";
      sc.masts.forEach((m, i) => {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = m.height !== null ? `${m.name} @ ${m.height} m` : m.name;
        select.appendChild(opt);
      });
    }
    select.value = String(state.mastIndex);
  }

  const mast = sc.masts[Math.min(state.mastIndex, sc.masts.length - 1)];
  if (!mast) return;

  const mean = mast.freq ? overallMeanSpeed(mast.freq) : null;
  setText("mast-mean", mean !== null ? `${fmt(mean, 2)} m/s` : "—");
  setText("mast-height", mast.height !== null ? `${fmt(mast.height, 1)} m` : "—");
  setText("mast-pos", mast.x !== null && mast.y !== null ? `${fmt(mast.x, 0)}, ${fmt(mast.y, 0)}` : "—");
  setText("mast-years", kvStr(mast.kvs, "Measurement Years") ?? "—");

  const roseEl = document.getElementById("mast-rose-plot");
  if (roseEl) {
    if (mast.freq) renderRose(roseEl, mast.freq);
    else roseEl.textContent = "No frequency table for this mast.";
  }
  const heatEl = document.getElementById("mast-heatmap-plot");
  if (heatEl) {
    if (mast.freq) renderHeatmap(heatEl, mast.freq);
    else heatEl.textContent = "No frequency table for this mast.";
  }
  const tiEl = document.getElementById("mast-ti-plot");
  if (tiEl) {
    const curve = mast.ti ? tiCurve(mast.ti, mast.freq) : null;
    if (curve) renderTiPlot(tiEl, curve);
    else tiEl.textContent = "No turbulence intensity table for this mast.";
  }

  const weibullBody = document.getElementById("weibull-table-body");
  if (weibullBody) {
    weibullBody.innerHTML = "";
    for (const row of mast.weibull) {
      const tr = document.createElement("tr");
      const cells = [
        String(row.sector),
        row.degrees,
        fmt(row.p, 2),
        fmt(row.a, 2),
        fmt(row.k, 2),
        fmt(row.mean, 2),
        fmt(row.energyPct, 2),
      ];
      cells.forEach((c, i) => {
        const td = document.createElement("td");
        td.textContent = c;
        if (i === 1) td.classList.add("text");
        tr.appendChild(td);
      });
      weibullBody.appendChild(tr);
    }
  }
  const weibullTile = document.getElementById("tile-weibull");
  if (weibullTile) weibullTile.hidden = mast.weibull.length === 0;
}
