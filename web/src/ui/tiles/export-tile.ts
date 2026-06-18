import Plotly from "plotly.js-dist-min";
import { downloadBlob, fileStem, scenarioJson, turbinesCsv } from "../../convert";
import { currentScenario, getState } from "../../state";

export function initExportTile(): void {
  document.getElementById("btn-csv")?.addEventListener("click", () => {
    const sc = currentScenario(getState());
    if (!sc) return;
    downloadBlob(turbinesCsv(sc), `${stem()}_turbines.csv`, "text/csv");
  });

  document.getElementById("btn-json")?.addEventListener("click", () => {
    const sc = currentScenario(getState());
    if (!sc) return;
    downloadBlob(scenarioJson(sc), `${stem()}.json`, "application/json");
  });

  document.getElementById("btn-png")?.addEventListener("click", () => {
    const sc = currentScenario(getState());
    if (!sc) return;
    const el = document.getElementById("map-plot") as HTMLElement | null;
    if (!el) return;
    type RL = Parameters<typeof Plotly.relayout>[1];
    const dark = "#333333";
    Plotly.relayout(el, {
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#ffffff",
      "font.color": dark,
      "xaxis.color": dark,
      "xaxis.gridcolor": "#cccccc",
      "yaxis.color": dark,
      "yaxis.gridcolor": "#cccccc",
      "legend.font.color": dark,
    } as RL)
      .then(() => Plotly.toImage(el, { format: "png", width: 1100, height: 800 }))
      .then((url) => {
        Plotly.relayout(el, {
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          "font.color": "#b0b0b6",
          "xaxis.color": "#b0b0b6",
          "xaxis.gridcolor": "#5a5a5a",
          "yaxis.color": "#b0b0b6",
          "yaxis.gridcolor": "#5a5a5a",
          "legend.font.color": "#b0b0b6",
        } as RL);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${stem()}_layout.png`;
        a.click();
      });
  });
}

export function updateExportTile(hasData: boolean): void {
  (["btn-csv", "btn-json", "btn-png"] as const).forEach((id) => {
    const el = document.getElementById(id) as HTMLButtonElement | null;
    if (el) el.disabled = !hasData;
  });
}

function stem(): string {
  return fileStem(getState().filename);
}
