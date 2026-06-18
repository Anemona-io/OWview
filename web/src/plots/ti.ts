import Plotly from "plotly.js-dist-min";
import type { TiCurve } from "../derive";
import { AXIS_COLOR, baseLayout, GRID_COLOR, PLOT_CONFIG } from "./palette";

export function renderTiPlot(el: HTMLElement, curve: TiCurve): void {
  const traces: Partial<Plotly.Data>[] = [
    {
      type: "scatter",
      mode: "lines",
      x: curve.speeds,
      y: curve.max,
      name: "Max across sectors",
      line: { width: 0 },
      hoverinfo: "skip",
      showlegend: false,
    } as Partial<Plotly.Data>,
    {
      type: "scatter",
      mode: "lines",
      x: curve.speeds,
      y: curve.min,
      name: "Sector min–max",
      line: { width: 0 },
      fill: "tonexty",
      fillcolor: "rgba(221, 141, 87, 0.15)",
      hoverinfo: "skip",
    } as Partial<Plotly.Data>,
    {
      type: "scatter",
      mode: "lines+markers",
      x: curve.speeds,
      y: curve.mean,
      name: "Frequency-weighted mean",
      line: { color: "#DD8D57", width: 2.5 },
      marker: { size: 5, color: "#DD8D57" },
      hovertemplate: "%{x} m/s · TI %{y:.1f}%<extra></extra>",
    } as Partial<Plotly.Data>,
  ];

  const layout: Partial<Plotly.Layout> = {
    ...baseLayout(),
    xaxis: { title: { text: "Wind speed [m/s]" }, color: AXIS_COLOR, gridcolor: GRID_COLOR },
    yaxis: { title: { text: "Turbulence intensity [%]" }, color: AXIS_COLOR, gridcolor: GRID_COLOR, rangemode: "tozero" },
    legend: { font: { color: AXIS_COLOR }, orientation: "h", y: 1.12 },
    margin: { t: 30, b: 45, l: 55, r: 10 },
    hovermode: "x unified",
  };

  Plotly.react(el, traces, layout, PLOT_CONFIG);
}
