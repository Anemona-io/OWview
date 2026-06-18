import type { AppState } from "../../state";
import { setCompareBaseline, toggleCompareScenario } from "../../state";
import { projectStats, type ScopeStats } from "../../derive";
import { categoricalColor } from "../../plots/palette";
import { renderCompareBars, renderCompareSites } from "../../plots/compare";
import { fmt } from "../format";

interface Col {
  i: number;
  name: string;
  color: string;
  present: boolean;
  stats: ScopeStats | null;
}

interface MetricRow {
  label: string;
  get: (s: ScopeStats) => number | null;
  dp: number;
  suffix?: string;
  delta?: boolean;
}

const METRICS: MetricRow[] = [
  { label: "Net energy [GWh]", get: (s) => s.netGwh, dp: 1, delta: true },
  { label: "Gross energy [GWh]", get: (s) => s.grossGwh, dp: 1, delta: true },
  { label: "Capacity factor", get: (s) => s.cf, dp: 1, suffix: "%", delta: true },
  { label: "Array efficiency", get: (s) => s.arrayEff, dp: 1, suffix: "%", delta: true },
  { label: "Topographic eff.", get: (s) => s.topoEff, dp: 1, suffix: "%", delta: true },
  { label: "Turbines", get: (s) => s.nTurbines, dp: 0 },
  { label: "Capacity [MW]", get: (s) => s.mw, dp: 1 },
];

export function initCompareTile(): void {
  document.getElementById("compare-chips")?.addEventListener("click", (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>(".compare-chip");
    if (chip?.dataset.idx) toggleCompareScenario(Number(chip.dataset.idx));
  });
  document.getElementById("compare-baseline")?.addEventListener("change", (e) => {
    const v = (e.target as HTMLSelectElement).value;
    setCompareBaseline(v === "none" ? -1 : Number(v));
  });
}

export function updateCompareTile(state: AppState): void {
  const scenarios = state.workbook?.scenarios ?? [];
  if (scenarios.length < 2) return;
  const scope = state.projectSite;
  const selected = state.compareScenarios.filter((i) => i < scenarios.length);

  // Scenario chips
  const chipsEl = document.getElementById("compare-chips");
  if (chipsEl) {
    chipsEl.innerHTML = "";
    scenarios.forEach((sc, i) => {
      const chip = document.createElement("button");
      chip.className = "compare-chip" + (selected.includes(i) ? " on" : "");
      chip.dataset.idx = String(i);
      chip.textContent = sc.sheetName;
      chipsEl.appendChild(chip);
    });
  }

  const scopeNote = document.getElementById("compare-scope");
  if (scopeNote) scopeNote.textContent = scope ? `· project: ${scope}` : "· all sites";

  // Baseline picker: the user chooses which compared scenario deltas are measured from.
  let baselineIdx = state.compareBaseline;
  if (baselineIdx !== -1 && !selected.includes(baselineIdx)) baselineIdx = selected[0] ?? -1;
  const baselineSel = document.getElementById("compare-baseline") as HTMLSelectElement | null;
  if (baselineSel) {
    baselineSel.innerHTML = "";
    for (const i of selected) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = scenarios[i].sheetName;
      baselineSel.appendChild(opt);
    }
    const none = document.createElement("option");
    none.value = "none";
    none.textContent = "None (no deltas)";
    baselineSel.appendChild(none);
    baselineSel.value = baselineIdx === -1 ? "none" : String(baselineIdx);
  }

  // One column per selected scenario, with project-presence detection.
  const cols: Col[] = selected.map((i) => {
    const sc = scenarios[i];
    const present = !scope || sc.sites.some((s) => s.name === scope);
    return { i, name: sc.sheetName, color: categoricalColor(i), present, stats: present ? projectStats(sc, scope) : null };
  });
  const baseline = baselineIdx === -1 ? null : cols.find((c) => c.i === baselineIdx) ?? null;

  renderTable(cols, baseline);

  // Net + CF by scenario
  const barsEl = document.getElementById("compare-bars-plot");
  if (barsEl) {
    renderCompareBars(barsEl, cols.map((c) => ({
      name: c.name, color: c.color,
      net: c.stats?.netGwh ?? null, cf: c.stats?.cf ?? null,
    })));
  }

  // Net energy per site across scenarios — only meaningful for the all-sites scope
  const sitesTile = document.getElementById("compare-sites-tile");
  const sitesEl = document.getElementById("compare-sites-plot");
  const showSites = scope === "";
  if (sitesTile) sitesTile.hidden = !showSites;
  if (showSites && sitesEl) {
    const siteNames: string[] = [];
    for (const c of cols) for (const s of scenarios[c.i].sites) if (!siteNames.includes(s.name)) siteNames.push(s.name);
    const series = cols.map((c) => ({
      name: c.name, color: c.color,
      values: siteNames.map((sn) => scenarios[c.i].sites.find((s) => s.name === sn)?.netGwh ?? null),
    }));
    renderCompareSites(sitesEl, siteNames, series);
  }
}

function renderTable(cols: Col[], baseline: Col | null): void {
  const head = document.getElementById("compare-table-head");
  const body = document.getElementById("compare-table-body");
  if (!head || !body) return;

  head.innerHTML = "";
  const htr = document.createElement("tr");
  htr.appendChild(th("Metric", "text"));
  for (const c of cols) {
    const cell = th(c.name);
    cell.style.color = c.color;
    if (c === baseline) {
      cell.classList.add("is-baseline");
      const tag = document.createElement("span");
      tag.className = "baseline-tag";
      tag.textContent = "baseline";
      cell.appendChild(tag);
    }
    htr.appendChild(cell);
  }
  head.appendChild(htr);

  body.innerHTML = "";
  for (const m of METRICS) {
    const tr = document.createElement("tr");
    const label = document.createElement("td");
    label.className = "text";
    label.textContent = m.label;
    tr.appendChild(label);

    const baseVal = baseline?.stats ? m.get(baseline.stats) : null;
    for (const c of cols) {
      const td = document.createElement("td");
      if (!c.present || !c.stats) {
        td.textContent = "—";
        td.classList.add("not-present");
        td.title = "Project not present in this scenario";
      } else {
        const v = m.get(c.stats);
        td.textContent = v === null ? "—" : `${fmt(v, m.dp)}${m.suffix ?? ""}`;
        if (m.delta && c !== baseline && v !== null && baseVal !== null) {
          const d = v - baseVal;
          if (Math.abs(d) >= 0.05) {
            const span = document.createElement("span");
            span.className = "delta " + (d > 0 ? "delta-pos" : "delta-neg");
            span.textContent = ` ${d > 0 ? "+" : "−"}${fmt(Math.abs(d), m.dp)}`;
            td.appendChild(span);
          }
        }
      }
      tr.appendChild(td);
    }
    body.appendChild(tr);
  }
}

function th(text: string, cls = ""): HTMLTableCellElement {
  const el = document.createElement("th");
  el.textContent = text;
  if (cls) el.className = cls;
  return el;
}
