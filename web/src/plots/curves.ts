import Plotly from "plotly.js-dist-min";
import type { CurveMatrix, TurbineType } from "../parse/types";
import { AXIS_COLOR, baseLayout, GRID_COLOR, PLOT_CONFIG } from "./palette";

/** Pick the curve column closest to standard air density. */
function pickColumn(curve: CurveMatrix, target = 1.225): { col: number; density: number } {
  let col = 0;
  for (let i = 1; i < curve.densities.length; i++) {
    if (Math.abs(curve.densities[i] - target) < Math.abs(curve.densities[col] - target)) col = i;
  }
  return { col, density: curve.densities[col] ?? target };
}

function columnSeries(curve: CurveMatrix): { x: number[]; y: number[]; density: number } {
  const { col, density } = pickColumn(curve);
  const x: number[] = [];
  const y: number[] = [];
  curve.speeds.forEach((s, i) => {
    const v = curve.values[i][col];
    if (v !== null) { x.push(s); y.push(v); }
  });
  return { x, y, density };
}

export function renderCurves(el: HTMLElement, tt: TurbineType): { density: number | null } {
  const traces: Partial<Plotly.Data>[] = [];
  let density: number | null = null;

  if (tt.power) {
    const s = columnSeries(tt.power);
    density = s.density;
    traces.push({
      type: "scatter",
      mode: "lines+markers",
      x: s.x,
      y: s.y,
      name: "Power [kW]",
      line: { color: "#DD8D57", width: 2.5 },
      marker: { size: 5, color: "#DD8D57" },
      hovertemplate: "%{x} m/s · %{y:.0f} kW<extra>Power</extra>",
    } as Partial<Plotly.Data>);
  }
  if (tt.thrust) {
    const s = columnSeries(tt.thrust);
    traces.push({
      type: "scatter",
      mode: "lines+markers",
      x: s.x,
      y: s.y,
      name: "Thrust Ct [-]",
      yaxis: "y2",
      line: { color: "#EDBE4F", width: 2, dash: "dash" },
      marker: { size: 4, color: "#EDBE4F" },
      hovertemplate: "%{x} m/s · Ct %{y:.3f}<extra>Thrust</extra>",
    } as Partial<Plotly.Data>);
  }

  const layout: Partial<Plotly.Layout> = {
    ...baseLayout(),
    xaxis: { title: { text: "Wind speed [m/s]" }, color: AXIS_COLOR, gridcolor: GRID_COLOR },
    yaxis: {
      title: { text: "Power [kW]" },
      color: AXIS_COLOR,
      gridcolor: GRID_COLOR,
      rangemode: "tozero",
    },
    yaxis2: {
      title: { text: "Thrust coefficient [-]" },
      color: AXIS_COLOR,
      overlaying: "y",
      side: "right",
      showgrid: false,
      rangemode: "tozero",
    },
    legend: { font: { color: AXIS_COLOR }, orientation: "h", y: 1.12 },
    margin: { t: 30, b: 45, l: 60, r: 60 },
    hovermode: "x unified",
  };

  Plotly.react(el, traces, layout, PLOT_CONFIG);
  return { density };
}
