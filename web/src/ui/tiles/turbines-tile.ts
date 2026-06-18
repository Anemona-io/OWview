import type { Turbine } from "../../parse/types";
import type { AppState } from "../../state";
import { currentScenario, setTurbineSiteFilter, setTurbineSort } from "../../state";
import { wakeLossPct } from "../../derive";
import { renderTurbineBars } from "../../plots/turbine-bars";
import { fmt } from "../format";

interface Column {
  key: string;
  label: string;
  get: (t: Turbine) => number | string | null;
  dp?: number;
  text?: boolean;
}

const COLUMNS: Column[] = [
  { key: "site", label: "Site", get: (t) => t.site, text: true },
  { key: "index", label: "#", get: (t) => t.index, dp: 0 },
  { key: "type", label: "Type", get: (t) => t.type, text: true },
  { key: "hubHeight", label: "Hub (m)", get: (t) => t.hubHeight, dp: 1 },
  { key: "capacityKw", label: "Cap (kW)", get: (t) => t.capacityKw, dp: 0 },
  { key: "elevation", label: "Elev (m)", get: (t) => t.elevation, dp: 0 },
  { key: "meanFree", label: "Free (m/s)", get: (t) => t.meanFree, dp: 2 },
  { key: "meanWaked", label: "Waked (m/s)", get: (t) => t.meanWaked, dp: 2 },
  { key: "netMwh", label: "Net (MWh)", get: (t) => t.netMwh, dp: 0 },
  { key: "cf", label: "CF (%)", get: (t) => t.cf, dp: 1 },
  { key: "topoEff", label: "Topo (%)", get: (t) => t.topoEff, dp: 1 },
  { key: "arrayEff", label: "Array (%)", get: (t) => t.arrayEff, dp: 1 },
  { key: "wakeLoss", label: "Wake loss (%)", get: (t) => wakeLossPct(t), dp: 1 },
];

export function initTurbinesTile(): void {
  document.getElementById("turbine-site-filter")?.addEventListener("change", (e) => {
    setTurbineSiteFilter((e.target as HTMLSelectElement).value);
  });

  const head = document.getElementById("turbine-table-head");
  if (head) {
    const tr = document.createElement("tr");
    for (const col of COLUMNS) {
      const th = document.createElement("th");
      th.textContent = col.label;
      th.dataset.key = col.key;
      th.addEventListener("click", () => setTurbineSort(col.key));
      tr.appendChild(th);
    }
    head.appendChild(tr);
  }
}

export function updateTurbinesTile(state: AppState): void {
  const sc = currentScenario(state);
  if (!sc) return;

  // Site filter options
  const filter = document.getElementById("turbine-site-filter") as HTMLSelectElement | null;
  if (filter) {
    const wanted = ["", ...sc.sites.map((s) => s.name)];
    const have = [...filter.options].map((o) => o.value);
    if (wanted.join("|") !== have.join("|")) {
      filter.innerHTML = "";
      for (const name of wanted) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name === "" ? "All sites" : name;
        filter.appendChild(opt);
      }
    }
    filter.value = state.turbineSiteFilter;
  }

  // Sort indicators
  document.querySelectorAll<HTMLElement>("#turbine-table-head th").forEach((th) => {
    const active = th.dataset.key === state.turbineSort.key;
    th.classList.toggle("sorted", active);
    th.dataset.dir = active ? (state.turbineSort.dir === 1 ? "▲" : "▼") : "";
  });

  // Rows
  const col = COLUMNS.find((c) => c.key === state.turbineSort.key) ?? COLUMNS[8];
  const dir = state.turbineSort.dir;
  const rows = sc.turbines
    .filter((t) => !state.turbineSiteFilter || t.site === state.turbineSiteFilter)
    .slice()
    .sort((a, b) => {
      const va = col.get(a);
      const vb = col.get(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === "string" || typeof vb === "string") {
        return String(va).localeCompare(String(vb)) * dir;
      }
      return (va - vb) * dir;
    });

  const body = document.getElementById("turbine-table-body");
  if (body) {
    body.innerHTML = "";
    for (const t of rows) {
      const tr = document.createElement("tr");
      if (state.projectSite && t.site !== state.projectSite) tr.classList.add("is-neighbour");
      for (const c of COLUMNS) {
        const td = document.createElement("td");
        const v = c.get(t);
        if (c.text) {
          td.textContent = v === null ? "—" : String(v);
          td.classList.add("text");
        } else {
          td.textContent = typeof v === "number" ? fmt(v, c.dp ?? 1) : "—";
        }
        tr.appendChild(td);
      }
      body.appendChild(tr);
    }
  }

  const barsEl = document.getElementById("turbine-bars-plot");
  if (barsEl) {
    if (sc.turbines.some((t) => t.netMwh !== null)) {
      renderTurbineBars(barsEl, sc, state.turbineSiteFilter, state.projectSite);
    } else {
      barsEl.textContent = "No per-turbine yields found.";
    }
  }
}
