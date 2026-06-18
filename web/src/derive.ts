import type { DirMatrix, Scenario, Turbine } from "./parse/types";

/** Energy totals subset shared by a scenario (all sites) and a single site. */
export interface EnergyTotals {
  idealGwh: number | null;
  theoGrossGwh: number | null;
  grossGwh: number | null;
  netGwh: number | null;
}

export function degreesToCompass(deg: number): string {
  const names = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return names[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

/** Wake (array) loss in % for one turbine. */
export function wakeLossPct(t: Turbine): number | null {
  if (t.arrayEff !== null) return 100 - t.arrayEff;
  if (t.grossMwh !== null && t.grossMwh > 0 && t.arrayMwh !== null) {
    return (1 - t.arrayMwh / t.grossMwh) * 100;
  }
  return null;
}

export interface WaterfallStep {
  name: string;
  value: number;
  measure: "absolute" | "relative" | "total";
}

/**
 * Energy cascade Ideal -> Net. The array-energy stop is reconstructed from the
 * per-turbine "Array Yield" column when available, splitting Gross->Net into
 * wake loss and remaining losses.
 */
export function waterfallSteps(totals: EnergyTotals, turbines: Turbine[]): WaterfallStep[] {
  const { idealGwh, theoGrossGwh, grossGwh, netGwh } = totals;
  if (idealGwh === null || netGwh === null) return [];
  const steps: WaterfallStep[] = [{ name: "Ideal", value: idealGwh, measure: "absolute" }];
  let level = idealGwh;

  if (theoGrossGwh !== null) {
    steps.push({ name: "Topographic effect", value: theoGrossGwh - level, measure: "relative" });
    level = theoGrossGwh;
  }
  if (grossGwh !== null && Math.abs(grossGwh - level) > 1e-6) {
    steps.push({ name: "Curtailment / adjustments", value: grossGwh - level, measure: "relative" });
    level = grossGwh;
  }
  const arrayGwh = sumMwh(turbines, (t) => t.arrayMwh);
  if (arrayGwh !== null && arrayGwh > 0 && arrayGwh <= level) {
    steps.push({ name: "Wake loss", value: arrayGwh - level, measure: "relative" });
    level = arrayGwh;
    if (Math.abs(netGwh - level) > 1e-3) {
      steps.push({ name: "Other losses", value: netGwh - level, measure: "relative" });
    }
  } else {
    steps.push({ name: "Losses", value: netGwh - level, measure: "relative" });
  }
  steps.push({ name: "Net", value: netGwh, measure: "total" });
  return steps;
}

function sumMwh(turbines: Turbine[], pick: (t: Turbine) => number | null): number | null {
  let sum = 0;
  let n = 0;
  for (const t of turbines) {
    const v = pick(t);
    if (v !== null) { sum += v; n++; }
  }
  return n > 0 ? sum / 1000 : null;
}

/* ── met mast aggregations ──────────────────────────────────────────── */

/** Sector frequencies in %, summed over all speed bins. */
export function sectorFrequencies(freq: DirMatrix): number[] {
  return freq.dirs.map((_, di) => 100 * freq.values.reduce((s, row) => s + row[di], 0));
}

export function meanSpeedPerSector(freq: DirMatrix): (number | null)[] {
  return freq.dirs.map((_, di) => {
    let p = 0, ps = 0;
    freq.values.forEach((row, si) => { p += row[di]; ps += row[di] * freq.speedMid[si]; });
    return p > 0 ? ps / p : null;
  });
}

export function overallMeanSpeed(freq: DirMatrix): number | null {
  let p = 0, ps = 0;
  freq.values.forEach((row, si) => row.forEach((v) => { p += v; ps += v * freq.speedMid[si]; }));
  return p > 0 ? ps / p : null;
}

/** Index of the last speed bin that still carries any frequency (for trimming plots). */
export function lastUsedSpeedBin(freq: DirMatrix): number {
  for (let si = freq.values.length - 1; si >= 0; si--) {
    if (freq.values[si].some((v) => v > 1e-9)) return si;
  }
  return freq.values.length - 1;
}

export interface RoseBand {
  label: string;
  /** % of time per direction sector */
  r: number[];
}

/** Aggregate fine speed bins into a handful of rose bands. */
export function roseBands(freq: DirMatrix, edges: number[] = [0, 4, 8, 12, 16, 20, Infinity]): RoseBand[] {
  const bands: RoseBand[] = [];
  for (let b = 0; b + 1 < edges.length; b++) {
    const r = freq.dirs.map((_, di) => {
      let s = 0;
      freq.values.forEach((row, si) => {
        const mid = freq.speedMid[si];
        if (mid >= edges[b] && mid < edges[b + 1]) s += row[di];
      });
      return s * 100;
    });
    if (r.some((v) => v > 1e-9)) {
      const label = edges[b + 1] === Infinity
        ? `>${edges[b]} m/s`
        : `${edges[b]}–${edges[b + 1]} m/s`;
      bands.push({ label, r });
    }
  }
  return bands;
}

export interface TiCurve {
  speeds: number[];
  mean: number[];
  min: number[];
  max: number[];
}

/**
 * TI vs wind speed: frequency-weighted mean across sectors (arithmetic mean
 * fallback when the bin carries no frequency), with min/max envelope.
 * Trimmed to speed bins that actually occur.
 */
export function tiCurve(ti: DirMatrix, freq: DirMatrix | null): TiCurve | null {
  if (ti.values.length === 0) return null;
  const lastBin = freq ? lastUsedSpeedBin(freq) : ti.values.length - 1;
  const out: TiCurve = { speeds: [], mean: [], min: [], max: [] };
  for (let si = 0; si < ti.values.length; si++) {
    if (freq && ti.speedMid[si] > freq.speedMid[Math.min(lastBin, freq.speedMid.length - 1)]) break;
    const row = ti.values[si];
    if (row.length === 0) continue;
    let wSum = 0, wTi = 0;
    if (freq && si < freq.values.length && ti.dirs.length === freq.dirs.length) {
      row.forEach((v, di) => { wSum += freq.values[si][di]; wTi += freq.values[si][di] * v; });
    }
    const mean = wSum > 0 ? wTi / wSum : row.reduce((s, v) => s + v, 0) / row.length;
    out.speeds.push(ti.speedMid[si]);
    out.mean.push(mean);
    out.min.push(Math.min(...row));
    out.max.push(Math.max(...row));
  }
  return out.speeds.length ? out : null;
}

/* ── workbook-level helpers ─────────────────────────────────────────── */

export function totalTurbines(sc: Scenario): number {
  return sc.turbines.length || sc.sites.reduce((s, x) => s + (x.nTurbines ?? 0), 0);
}

export function totalMw(sc: Scenario): number | null {
  const fromSites = sc.sites.reduce((s, x) => s + (x.mw ?? 0), 0);
  if (fromSites > 0) return fromSites;
  const fromTurbines = sc.turbines.reduce((s, t) => s + (t.capacityKw ?? 0), 0) / 1000;
  return fromTurbines > 0 ? fromTurbines : null;
}

/* ── project focus ──────────────────────────────────────────────────── */

export interface ScopeStats extends EnergyTotals {
  label: string;
  isAll: boolean;
  cf: number | null;
  topoEff: number | null;
  arrayEff: number | null;
  nTurbines: number;
  mw: number | null;
  turbines: Turbine[];
  neighbourSites: string[];
  neighbourTurbines: number;
}

export function isProjectTurbine(t: Turbine, projectSite: string): boolean {
  return !projectSite || t.site === projectSite;
}

/**
 * Headline stats for the current focus. When `projectSite` names a site, the
 * KPIs/waterfall describe that site alone (its yields already include the
 * neighbours' external wake); otherwise the whole report ("All sites").
 */
export function projectStats(sc: Scenario, projectSite: string): ScopeStats {
  const site = projectSite ? sc.sites.find((s) => s.name === projectSite) : undefined;
  if (site) {
    const turbines = sc.turbines.filter((t) => t.site === site.name);
    const neighbourSites = sc.sites.filter((s) => s.name !== site.name).map((s) => s.name);
    return {
      label: site.name, isAll: false,
      idealGwh: site.idealGwh, theoGrossGwh: site.theoGrossGwh,
      grossGwh: site.grossGwh, netGwh: site.netGwh,
      cf: site.cf, topoEff: site.topoEff, arrayEff: site.arrayEff,
      nTurbines: site.nTurbines ?? turbines.length, mw: site.mw,
      turbines, neighbourSites, neighbourTurbines: sc.turbines.length - turbines.length,
    };
  }
  return {
    label: "All sites", isAll: true,
    idealGwh: sc.totals.idealGwh, theoGrossGwh: sc.totals.theoGrossGwh,
    grossGwh: sc.totals.grossGwh, netGwh: sc.totals.netGwh,
    cf: sc.totals.cf, topoEff: sc.totals.topoEff, arrayEff: sc.totals.arrayEff,
    nTurbines: totalTurbines(sc), mw: totalMw(sc),
    turbines: sc.turbines, neighbourSites: [], neighbourTurbines: 0,
  };
}

/** Distinct mast positions (the same mast often appears once per height). */
export function mastPositions(sc: Scenario): { name: string; x: number; y: number }[] {
  const seen = new Map<string, { name: string; x: number; y: number }>();
  for (const m of sc.masts) {
    if (m.x === null || m.y === null) continue;
    const key = `${m.x.toFixed(1)}|${m.y.toFixed(1)}`;
    if (!seen.has(key)) seen.set(key, { name: m.name, x: m.x, y: m.y });
  }
  return [...seen.values()];
}
