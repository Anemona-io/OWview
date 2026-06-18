import Plotly from "plotly.js-dist-min";
import type { WaterfallStep } from "../derive";
import { baseLayout, GRID_COLOR, PLOT_CONFIG } from "./palette";

export function renderWaterfall(el: HTMLElement, steps: WaterfallStep[]): void {
  const trace = {
    type: "waterfall",
    orientation: "v",
    x: steps.map((s) => s.name),
    y: steps.map((s) => s.value),
    measure: steps.map((s) => s.measure),
    text: steps.map((s) =>
      s.measure === "relative" ? `${s.value >= 0 ? "+" : ""}${s.value.toFixed(1)}` : s.value.toFixed(1)
    ),
    textposition: "outside",
    textfont: { color: "#e5e7eb" },
    connector: { line: { color: GRID_COLOR, width: 1 } },
    increasing: { marker: { color: "#EDBE4F" } },
    decreasing: { marker: { color: "#A43E85" } },
    totals: { marker: { color: "#DD8D57" } },
    hovertemplate: "%{x}<br>%{y:.2f} GWh<extra></extra>",
  } as unknown as Partial<Plotly.Data>;

  const ys = steps.map((s) => s.value);
  const maxY = Math.max(...ys.filter((v) => isFinite(v)), 0);

  const layout: Partial<Plotly.Layout> = {
    ...baseLayout(),
    yaxis: {
      title: { text: "Energy [GWh]" },
      color: "#b0b0b6",
      gridcolor: GRID_COLOR,
      range: [0, maxY * 1.12],
    },
    xaxis: { color: "#b0b0b6" },
    showlegend: false,
  };

  Plotly.react(el, [trace], layout, PLOT_CONFIG);
}
