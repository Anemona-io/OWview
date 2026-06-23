import type { ParseDiagnostics, ParsedWorkbook, Scenario } from "./parse/types";

export type MapColorBy = "site" | "netMwh" | "arrayEff" | "cf" | "meanFree";

export interface TurbineSort {
  key: string;
  dir: 1 | -1;
}

export interface AppState {
  workbook: ParsedWorkbook | null;
  scenarioIndex: number;
  filename: string;
  error: string | null;
  /** Diagnostics from a failed parse, used to offer a "Report this file" email. */
  errorDiagnostics: ParseDiagnostics | null;
  mapColorBy: MapColorBy;
  projectSite: string; // "" = all sites (focus the whole report)
  compareScenarios: number[]; // scenario indices included in the comparison
  compareBaseline: number; // scenario index used as the delta baseline, or -1 = none
  turbineSiteFilter: string; // "" = all sites
  turbineSort: TurbineSort;
  typeIndex: number;
  mastIndex: number;
}

type Listener = (state: AppState) => void;

const state: AppState = {
  workbook: null,
  scenarioIndex: 0,
  filename: "",
  error: null,
  errorDiagnostics: null,
  mapColorBy: "site",
  projectSite: "",
  compareScenarios: [],
  compareBaseline: 0,
  turbineSiteFilter: "",
  turbineSort: { key: "netMwh", dir: -1 },
  typeIndex: 0,
  mastIndex: 0,
};

const listeners: Set<Listener> = new Set();

export function getState(): Readonly<AppState> {
  return state;
}

export function currentScenario(s: AppState = state): Scenario | null {
  return s.workbook?.scenarios[s.scenarioIndex] ?? null;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  listeners.forEach((fn) => fn(state));
}

export function setWorkbook(wb: ParsedWorkbook, filename: string): void {
  state.workbook = wb;
  state.filename = filename;
  state.scenarioIndex = 0;
  state.error = null;
  state.errorDiagnostics = null;
  state.projectSite = "";
  state.compareScenarios = wb.scenarios.map((_, i) => i);
  state.compareBaseline = 0;
  state.turbineSiteFilter = "";
  state.turbineSort = { key: "netMwh", dir: -1 };
  state.typeIndex = 0;
  state.mastIndex = 0;
  notify();
}

export function setError(msg: string, diagnostics: ParseDiagnostics | null = null): void {
  state.error = msg;
  state.errorDiagnostics = diagnostics;
  state.workbook = null;
  notify();
}

export function setScenarioIndex(i: number): void {
  state.scenarioIndex = i;
  state.turbineSiteFilter = "";
  state.typeIndex = 0;
  state.mastIndex = 0;
  // Keep the project selection across scenarios only if that site still exists.
  const sc = state.workbook?.scenarios[i];
  if (state.projectSite && !sc?.sites.some((s) => s.name === state.projectSite)) {
    state.projectSite = "";
  }
  notify();
}

export function setMapColorBy(v: MapColorBy): void {
  state.mapColorBy = v;
  notify();
}

export function setProjectSite(v: string): void {
  state.projectSite = v;
  notify();
}

export function toggleCompareScenario(i: number): void {
  const set = new Set(state.compareScenarios);
  if (set.has(i)) {
    if (set.size <= 1) return; // keep at least one scenario selected
    set.delete(i);
  } else {
    set.add(i);
  }
  state.compareScenarios = [...set].sort((a, b) => a - b);
  // If the baseline scenario was removed, fall back to the first remaining one.
  if (state.compareBaseline !== -1 && !set.has(state.compareBaseline)) {
    state.compareBaseline = state.compareScenarios[0];
  }
  notify();
}

export function setCompareBaseline(i: number): void {
  state.compareBaseline = i;
  notify();
}

export function setTurbineSiteFilter(v: string): void {
  state.turbineSiteFilter = v;
  notify();
}

export function setTurbineSort(key: string): void {
  if (state.turbineSort.key === key) {
    state.turbineSort = { key, dir: state.turbineSort.dir === 1 ? -1 : 1 };
  } else {
    state.turbineSort = { key, dir: -1 };
  }
  notify();
}

export function setTypeIndex(i: number): void {
  state.typeIndex = i;
  notify();
}

export function setMastIndex(i: number): void {
  state.mastIndex = i;
  notify();
}
