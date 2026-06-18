import Plotly from "plotly.js-dist-min";
import { AXIS_COLOR, baseLayout, GRID_COLOR, PLOT_CONFIG } from "./palette";

export interface CompareItem {
  name: string;
  color: string;
  net: number | null;
  cf: number | null;
}

/** Net energy bars (one per scenario) + capacity-factor markers on a 2nd axis. */
export function renderCompareBars(el: HTMLElement, items: CompareItem[]): void {
  const names = items.map((d) => d.name);
  const traces: Partial<Plotly.Data>[] = [
    {
      type: "bar",
      x: names,
      y: items.map((d) => d.net),
      name: "Net energy [GWh]",
      marker: { color: items.map((d) => d.color) },
      text: items.map((d) => (d.net !== null ? `${d.net.toFixed(1)}` : "")),
      textposition: "inside",
      insidetextanchor: "middle",
      textfont: { color: "#2e2e33" },
      hovertemplate: "%{x}<br>Net: %{y:.2f} GWh<extra></extra>",
    } as Partial<Plotly.Data>,
    {
      type: "scatter",
      mode: "markers",
      x: names,
      y: items.map((d) => d.cf),
      name: "Capacity factor [%]",
      yaxis: "y2",
      marker: { size: 11, symbol: "diamond", color: "#e5e7eb", line: { color: "#2e2e33", width: 1 } },
      hovertemplate: "%{x}<br>CF: %{y:.1f}%<extra></extra>",
    } as Partial<Plotly.Data>,
  ];

  const maxNet = Math.max(...items.map((d) => d.net ?? 0), 0);
  const layout: Partial<Plotly.Layout> = {
    ...baseLayout(),
    yaxis: { title: { text: "Net energy [GWh]" }, color: AXIS_COLOR, gridcolor: GRID_COLOR, range: [0, maxNet * 1.18] },
    yaxis2: { title: { text: "CF [%]" }, color: AXIS_COLOR, overlaying: "y", side: "right", showgrid: false, rangemode: "tozero" },
    xaxis: { color: AXIS_COLOR },
    legend: { font: { color: AXIS_COLOR }, orientation: "h", y: 1.12 },
    showlegend: true,
    margin: { t: 30, b: 45, l: 55, r: 55 },
  };
  Plotly.react(el, traces, layout, PLOT_CONFIG);
}

export interface CompareSeries {
  name: string;
  color: string;
  values: (number | null)[];
}

/** Grouped bars: site on the x-axis, one bar per scenario. */
export function renderCompareSites(el: HTMLElement, siteNames: string[], series: CompareSeries[]): void {
  const traces: Partial<Plotly.Data>[] = series.map((s) => ({
    type: "bar",
    x: siteNames,
    y: s.values,
    name: s.name,
    marker: { color: s.color },
    hovertemplate: `${s.name}<br>%{x}: %{y:.2f} GWh<extra></extra>`,
  })) as Partial<Plotly.Data>[];

  const layout: Partial<Plotly.Layout> = {
    ...baseLayout(),
    barmode: "group",
    yaxis: { title: { text: "Net energy [GWh]" }, color: AXIS_COLOR, gridcolor: GRID_COLOR, rangemode: "tozero" },
    xaxis: { color: AXIS_COLOR },
    legend: { font: { color: AXIS_COLOR }, orientation: "h", y: 1.14 },
    showlegend: true,
    margin: { t: 30, b: 45, l: 55, r: 10 },
  };
  Plotly.react(el, traces, layout, PLOT_CONFIG);
}
