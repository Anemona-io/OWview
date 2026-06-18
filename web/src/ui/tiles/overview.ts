import type { Scenario } from "../../parse/types";
import { projectStats, waterfallSteps } from "../../derive";
import { renderWaterfall } from "../../plots/waterfall";
import { kvStr } from "../../parse/grid";
import { fmt, setText } from "../format";

export function updateOverview(sc: Scenario, projectSite = ""): void {
  const stats = projectStats(sc, projectSite);

  setText("stat-net", fmt(stats.netGwh, 1));
  setText("stat-gross", fmt(stats.grossGwh, 1));
  setText("stat-cf", stats.cf !== null ? `${fmt(stats.cf, 1)}%` : "—");
  setText("stat-arreff", stats.arrayEff !== null ? `${fmt(stats.arrayEff, 1)}%` : "—");
  setText("stat-topoeff", stats.topoEff !== null ? `${fmt(stats.topoEff, 1)}%` : "—");
  setText("stat-turbines", String(stats.nTurbines || "—"));
  setText("stat-mw", fmt(stats.mw, 1));

  const allKvs = sc.groups.flatMap((g) => g.kvs);
  setText("stat-wake-model", kvStr(allKvs, "Wake Model") ?? "—");

  // Scope banner: clearly label the selected project vs the neighbours.
  const banner = document.getElementById("scope-banner");
  if (banner) {
    const ext = sc.externalLayers.length;
    if (stats.isAll) {
      const bits = [`${stats.nTurbines} turbines`, `${fmt(stats.mw, 1)} MW`, `${sc.sites.length} sites`];
      if (ext) bits.push(`${ext} external layer${ext > 1 ? "s" : ""}`);
      banner.innerHTML =
        `<span class="scope-strong">All sites</span>` +
        `<span class="scope-note">${bits.join(" · ")}</span>`;
    } else {
      const nb: string[] = [];
      if (stats.neighbourSites.length) {
        nb.push(`${stats.neighbourSites.join(", ")} (${stats.neighbourTurbines} turbines)`);
      }
      if (ext) nb.push(`${ext} external layer${ext > 1 ? "s" : ""}`);
      banner.innerHTML =
        `<span class="scope-strong">Project: ${stats.label}</span>` +
        `<span class="scope-note">${stats.nTurbines} turbines · ${fmt(stats.mw, 1)} MW</span>` +
        (nb.length
          ? `<span class="scope-neighbours">Neighbours — external wake included: ${nb.join(" + ")}</span>`
          : "");
    }
    banner.hidden = false;
  }

  const steps = waterfallSteps(stats, stats.turbines);
  const wfEl = document.getElementById("waterfall-plot");
  if (wfEl) {
    if (steps.length) renderWaterfall(wfEl, steps);
    else wfEl.textContent = "No energy totals found in this report.";
  }

  const metaEl = document.getElementById("meta-list");
  if (metaEl) {
    const rows: [string, string | null][] = [
      ["Report date", sc.meta.date],
      ["OpenWind version", sc.meta.version],
      ["Licensed to", sc.meta.licensedTo],
      ["Projection", sc.meta.projection],
      ["EPSG", sc.meta.epsg],
      ["Datum", sc.meta.datum],
      ["Time zone", sc.meta.timeZone],
      ["External layers", sc.externalLayers.length ? sc.externalLayers.join(", ") : null],
    ];
    metaEl.innerHTML = "";
    for (const [k, v] of rows) {
      if (!v) continue;
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      metaEl.append(dt, dd);
    }
  }
}
