import type Plotly from "plotly.js-dist-min";

/** Anemona brand ramp, dark indigo -> yellow. */
export const PLASMA_STOPS = [
  "#1D1981", "#4F269C", "#7D2F9F", "#A43E85",
  "#C3646A", "#DD8D57", "#EDBE4F", "#F9DB46",
];

/** Brand colors reordered for categorical series on the dark surface. */
const CATEGORICAL = [
  "#DD8D57", "#EDBE4F", "#A43E85", "#C3646A", "#7D2F9F", "#4F269C", "#F9DB46", "#1D1981",
];

export const ACCENT = "#DD8D57";
export const AXIS_COLOR = "#b0b0b6";
export const GRID_COLOR = "#5a5a5a";

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

export function plasmaAt(t: number): string {
  const scaled = t * (PLASMA_STOPS.length - 1);
  const lo = Math.min(Math.floor(scaled), PLASMA_STOPS.length - 2);
  const f = scaled - lo;
  const [r0, g0, b0] = hexToRgb(PLASMA_STOPS[lo]);
  const [r1, g1, b1] = hexToRgb(PLASMA_STOPS[lo + 1]);
  return "#" + [r0 + f * (r1 - r0), g0 + f * (g1 - g0), b0 + f * (b1 - b0)]
    .map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

export function sampleColorscale(n: number): string[] {
  if (n <= 1) return [PLASMA_STOPS[PLASMA_STOPS.length - 1]];
  return Array.from({ length: n }, (_, i) => plasmaAt(i / (n - 1)));
}

const N_STOPS = 20;
export const PLASMA_SCALE: [number, string][] = Array.from({ length: N_STOPS }, (_, i) => {
  const t = i / (N_STOPS - 1);
  return [t, plasmaAt(t)];
});

export function categoricalColor(i: number): string {
  return CATEGORICAL[i % CATEGORICAL.length];
}

/** Stable color per site name, in scenario site order. */
export function siteColorMap(siteNames: string[]): Map<string, string> {
  const m = new Map<string, string>();
  siteNames.forEach((name, i) => m.set(name, categoricalColor(i)));
  return m;
}

export function baseLayout(): Partial<Plotly.Layout> {
  return {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { family: "Outfit, system-ui, sans-serif", color: AXIS_COLOR, size: 13 },
    margin: { t: 10, b: 45, l: 55, r: 10 },
  };
}

export const PLOT_CONFIG: Partial<Plotly.Config> = { responsive: true, displayModeBar: false };
