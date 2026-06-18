import Plotly from "plotly.js-dist-min";
import type { Scenario } from "../parse/types";
import { AXIS_COLOR, baseLayout, GRID_COLOR, PLOT_CONFIG, siteColorMap } from "./palette";

export function renderSiteBars(el: HTMLElement, sc: Scenario, projectSite = ""): void {
  const sites = sc.sites.filter((s) => s.netGwh !== null || s.cf !== null);
  const colors = siteColorMap(sc.sites.map((s) => s.name));
  const names = sites.map((s) => s.name);
  const barColor = (n: string) =>
    projectSite && n !== projectSite ? "#6e6e76" : (colors.get(n) ?? "#DD8D57");

  const traces: Partial<Plotly.Data>[] = [
    {
      type: "bar",
      x: names,
      y: sites.map((s) => s.netGwh),
      name: "Net energy [GWh]",
      marker: { color: names.map(barColor) },
      text: sites.map((s) => (s.netGwh !== null ? `${s.netGwh.toFixed(1)} GWh` : "")),
      textposition: "inside",
      insidetextanchor: "middle",
      textfont: { color: "#2e2e33" },
      hovertemplate: "%{x}<br>Net: %{y:.2f} GWh<extra></extra>",
    } as Partial<Plotly.Data>,
    {
      type: "scatter",
      mode: "markers",
      x: names,
      y: sites.map((s) => s.cf),
      name: "Capacity factor [%]",
      yaxis: "y2",
      marker: { size: 11, symbol: "diamond", color: "#e5e7eb", line: { color: "#2e2e33", width: 1 } },
      hovertemplate: "%{x}<br>CF: %{y:.1f}%<extra></extra>",
    } as Partial<Plotly.Data>,
  ];

  const maxNet = Math.max(...sites.map((s) => s.netGwh ?? 0), 0);

  const layout: Partial<Plotly.Layout> = {
    ...baseLayout(),
    yaxis: {
      title: { text: "Net energy [GWh]" },
      color: AXIS_COLOR,
      gridcolor: GRID_COLOR,
      range: [0, maxNet * 1.18],
    },
    yaxis2: {
      title: { text: "CF [%]" },
      color: AXIS_COLOR,
      overlaying: "y",
      side: "right",
      showgrid: false,
      rangemode: "tozero",
    },
    xaxis: { color: AXIS_COLOR },
    legend: { font: { color: AXIS_COLOR }, orientation: "h", y: 1.12 },
    showlegend: true,
    margin: { t: 30, b: 45, l: 55, r: 55 },
  };

  Plotly.react(el, traces, layout, PLOT_CONFIG);
}
