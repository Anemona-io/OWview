import Plotly from "plotly.js-dist-min";
import type { Scenario, Turbine } from "../parse/types";
import type { MapColorBy } from "../state";
import { mastPositions, wakeLossPct } from "../derive";
import { AXIS_COLOR, baseLayout, GRID_COLOR, PLASMA_SCALE, PLOT_CONFIG, siteColorMap } from "./palette";

const METRICS: Record<Exclude<MapColorBy, "site">, { label: string; get: (t: Turbine) => number | null }> = {
  netMwh: { label: "Net yield [MWh]", get: (t) => t.netMwh },
  arrayEff: { label: "Array efficiency [%]", get: (t) => t.arrayEff },
  cf: { label: "Capacity factor [%]", get: (t) => t.cf },
  meanFree: { label: "Mean free speed [m/s]", get: (t) => t.meanFree },
};

function hoverText(t: Turbine): string {
  const lines = [
    `<b>${t.site} · T${t.index ?? "?"}</b>`,
    t.type ?? "",
    t.netMwh !== null ? `Net: ${t.netMwh.toFixed(0)} MWh` : "",
    t.cf !== null ? `CF: ${t.cf.toFixed(1)}%` : "",
    t.arrayEff !== null ? `Array eff: ${t.arrayEff.toFixed(1)}%` : "",
    wakeLossPct(t) !== null ? `Wake loss: ${wakeLossPct(t)!.toFixed(1)}%` : "",
    t.meanFree !== null ? `Free wind: ${t.meanFree.toFixed(2)} m/s` : "",
    t.elevation !== null ? `Elevation: ${t.elevation.toFixed(0)} m` : "",
  ];
  return lines.filter(Boolean).join("<br>");
}

export function renderLayoutMap(el: HTMLElement, sc: Scenario, colorBy: MapColorBy, projectSite = ""): void {
  const all = sc.turbines.filter((t) => t.x !== null && t.y !== null);
  const isNeighbour = (t: Turbine) => projectSite !== "" && t.site !== projectSite;
  const project = all.filter((t) => !isNeighbour(t));
  const neighbours = all.filter(isNeighbour);
  const traces: Partial<Plotly.Data>[] = [];

  if (colorBy === "site") {
    const colors = siteColorMap(sc.sites.map((s) => s.name));
    for (const site of sc.sites) {
      if (projectSite && site.name !== projectSite) continue; // neighbours drawn as one dim trace
      const ts = project.filter((t) => t.site === site.name);
      if (!ts.length) continue;
      traces.push({
        type: "scatter",
        mode: "markers",
        x: ts.map((t) => t.x),
        y: ts.map((t) => t.y),
        name: site.name,
        marker: { size: 11, color: colors.get(site.name), line: { color: "#2e2e33", width: 1 } },
        text: ts.map(hoverText),
        hovertemplate: "%{text}<extra></extra>",
      } as Partial<Plotly.Data>);
    }
  } else {
    const metric = METRICS[colorBy];
    traces.push({
      type: "scatter",
      mode: "markers",
      x: project.map((t) => t.x),
      y: project.map((t) => t.y),
      name: "Turbines",
      marker: {
        size: 11,
        color: project.map((t) => metric.get(t)),
        colorscale: PLASMA_SCALE,
        colorbar: { title: { text: metric.label, side: "right" }, tickfont: { color: AXIS_COLOR } },
        line: { color: "#2e2e33", width: 1 },
      },
      text: project.map(hoverText),
      hovertemplate: "%{text}<extra></extra>",
      showlegend: false,
    } as Partial<Plotly.Data>);
  }

  // Neighbours: visible but dimmed, grouped under one labelled trace.
  if (neighbours.length) {
    traces.push({
      type: "scatter",
      mode: "markers",
      x: neighbours.map((t) => t.x),
      y: neighbours.map((t) => t.y),
      name: "Neighbours (external wake)",
      marker: { size: 9, color: "#8a8a92", opacity: 0.5, line: { color: "#2e2e33", width: 1 } },
      text: neighbours.map(hoverText),
      hovertemplate: "%{text}<extra></extra>",
    } as Partial<Plotly.Data>);
  }

  const masts = mastPositions(sc);
  if (masts.length) {
    traces.push({
      type: "scatter",
      mode: "markers",
      x: masts.map((m) => m.x),
      y: masts.map((m) => m.y),
      name: "Met masts",
      marker: { size: 11, symbol: "diamond-open", color: "#e5e7eb", line: { width: 2 } },
      text: masts.map((m) => `<b>Met mast</b><br>${m.name}`),
      hovertemplate: "%{text}<extra></extra>",
    } as Partial<Plotly.Data>);
  }

  const layout: Partial<Plotly.Layout> = {
    ...baseLayout(),
    margin: { t: 10, b: 50, l: 75, r: 10 },
    xaxis: {
      title: { text: "X [m]" },
      color: AXIS_COLOR,
      gridcolor: GRID_COLOR,
      tickformat: ",.0f",
      zeroline: false,
    },
    yaxis: {
      title: { text: "Y [m]" },
      color: AXIS_COLOR,
      gridcolor: GRID_COLOR,
      tickformat: ",.0f",
      zeroline: false,
      scaleanchor: "x",
      scaleratio: 1,
    },
    legend: { font: { color: AXIS_COLOR }, orientation: "h", y: -0.12 },
    hovermode: "closest",
  };

  Plotly.react(el, traces, layout, PLOT_CONFIG);
}
