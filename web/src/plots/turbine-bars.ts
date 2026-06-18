import Plotly from "plotly.js-dist-min";
import type { Scenario } from "../parse/types";
import { wakeLossPct } from "../derive";
import { AXIS_COLOR, baseLayout, GRID_COLOR, PLOT_CONFIG, siteColorMap } from "./palette";

export function renderTurbineBars(el: HTMLElement, sc: Scenario, siteFilter: string, projectSite = ""): void {
  const colors = siteColorMap(sc.sites.map((s) => s.name));
  const turbines = sc.turbines
    .filter((t) => !siteFilter || t.site === siteFilter)
    .filter((t) => t.netMwh !== null)
    .slice()
    .sort((a, b) => (a.netMwh ?? 0) - (b.netMwh ?? 0)); // ascending: largest on top

  const labels = turbines.map((t) => `${shorten(t.site)} T${t.index ?? "?"}`);

  const trace = {
    type: "bar",
    orientation: "h",
    x: turbines.map((t) => t.netMwh),
    y: labels,
    marker: {
      color: turbines.map((t) =>
        projectSite && t.site !== projectSite ? "#6e6e76" : (colors.get(t.site) ?? "#DD8D57")),
    },
    text: turbines.map((t) => {
      const wl = wakeLossPct(t);
      return wl !== null ? `wake −${wl.toFixed(1)}%` : "";
    }),
    textposition: "inside",
    insidetextanchor: "end",
    textfont: { color: "#2e2e33", size: 10 },
    hovertemplate: "%{y}<br>Net: %{x:.0f} MWh<extra></extra>",
  } as unknown as Partial<Plotly.Data>;

  const layout: Partial<Plotly.Layout> = {
    ...baseLayout(),
    height: Math.max(280, turbines.length * 22 + 70),
    xaxis: { title: { text: "Net yield [MWh]" }, color: AXIS_COLOR, gridcolor: GRID_COLOR },
    yaxis: { color: AXIS_COLOR, automargin: true, tickfont: { size: 10 } },
    margin: { t: 8, b: 45, l: 10, r: 10 },
    showlegend: false,
  };

  Plotly.react(el, [trace], layout, PLOT_CONFIG);
}

function shorten(name: string): string {
  return name.length > 16 ? name.slice(0, 15) + "…" : name;
}
