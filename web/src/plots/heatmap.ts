import Plotly from "plotly.js-dist-min";
import type { DirMatrix } from "../parse/types";
import { lastUsedSpeedBin } from "../derive";
import { AXIS_COLOR, baseLayout, GRID_COLOR, PLASMA_SCALE, PLOT_CONFIG } from "./palette";

export function renderHeatmap(el: HTMLElement, freq: DirMatrix): void {
  const lastBin = lastUsedSpeedBin(freq);
  const z = freq.values.slice(0, lastBin + 1).map((row) => row.map((p) => p * 100));
  const xLabels = freq.dirs.map((d) => `${d.toFixed(0)}°`);
  const yLabels = freq.speedLabels.slice(0, lastBin + 1).map((s) => s.trim());

  const traces: Partial<Plotly.Data>[] = [
    {
      type: "heatmap",
      z,
      x: xLabels,
      y: yLabels,
      colorscale: PLASMA_SCALE,
      colorbar: {
        title: { text: "Joint prob (%)", font: { color: AXIS_COLOR } },
        tickfont: { color: AXIS_COLOR },
      },
      hovertemplate: "Dir: %{x}<br>Speed: %{y} m/s<br>%{z:.3f}%<extra></extra>",
    } as Partial<Plotly.Data>,
  ];

  const layout: Partial<Plotly.Layout> = {
    ...baseLayout(),
    xaxis: { title: { text: "Direction sector" }, color: AXIS_COLOR, gridcolor: GRID_COLOR },
    yaxis: { title: { text: "Wind speed bin [m/s]" }, color: AXIS_COLOR, gridcolor: GRID_COLOR },
    margin: { t: 10, b: 50, l: 90, r: 10 },
  };

  Plotly.react(el, traces, layout, PLOT_CONFIG);
}
