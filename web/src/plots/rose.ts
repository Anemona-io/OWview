import Plotly from "plotly.js-dist-min";
import type { DirMatrix } from "../parse/types";
import { degreesToCompass, meanSpeedPerSector, roseBands, sectorFrequencies } from "../derive";
import { AXIS_COLOR, baseLayout, GRID_COLOR, PLOT_CONFIG, sampleColorscale } from "./palette";

export function renderRose(el: HTMLElement, freq: DirMatrix): void {
  const bands = roseBands(freq);
  const thetaLabels = freq.dirs.map(degreesToCompass);
  const colors = sampleColorscale(bands.length);
  const freqs = sectorFrequencies(freq);
  const means = meanSpeedPerSector(freq);

  const traces: Partial<Plotly.Data>[] = bands.map((band, i) => ({
    type: "barpolar" as const,
    r: band.r,
    theta: thetaLabels,
    name: band.label,
    marker: { color: colors[i], opacity: 0.85 },
    customdata: freq.dirs.map((_, j) => [thetaLabels[j], means[j]?.toFixed(1) ?? "—", freqs[j].toFixed(1)]),
    hovertemplate:
      "<b>%{customdata[0]}</b><br>" +
      "Sector freq: %{customdata[2]}%<br>" +
      "Sector mean: %{customdata[1]} m/s" +
      "<extra>%{data.name}</extra>",
  } as Partial<Plotly.Data>));

  // Prevailing direction marker
  const prevIdx = freqs.reduce((mi, f, i) => (f > freqs[mi] ? i : mi), 0);
  const prevR = bands.reduce((s, b) => s + b.r[prevIdx], 0);
  traces.push({
    type: "scatterpolar" as const,
    r: [0, prevR * 1.08],
    theta: [thetaLabels[prevIdx], thetaLabels[prevIdx]],
    mode: "lines+markers" as const,
    marker: { size: [0, 9], symbol: "triangle-up", color: "#EDBE4F" },
    line: { color: "#EDBE4F", width: 2.5, dash: "dot" as const },
    name: `Prevailing: ${thetaLabels[prevIdx]} (${freqs[prevIdx].toFixed(1)}%)`,
    hovertemplate: `Prevailing: ${thetaLabels[prevIdx]}<br>${freqs[prevIdx].toFixed(1)}% of time<extra></extra>`,
  } as Partial<Plotly.Data>);

  const layout: Partial<Plotly.Layout> = {
    ...baseLayout(),
    polar: {
      bgcolor: "transparent",
      radialaxis: { title: { text: "Frequency (%)" }, color: AXIS_COLOR, gridcolor: GRID_COLOR },
      angularaxis: { direction: "clockwise" as const, rotation: 90, color: AXIS_COLOR, gridcolor: GRID_COLOR },
    },
    showlegend: true,
    legend: { title: { text: "Speed band", font: { color: AXIS_COLOR } }, font: { color: AXIS_COLOR } },
    margin: { t: 25, b: 10, l: 10, r: 10 },
  };

  Plotly.react(el, traces, layout, PLOT_CONFIG);
}
