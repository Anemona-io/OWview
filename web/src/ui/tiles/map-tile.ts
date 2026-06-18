import type { AppState } from "../../state";
import { currentScenario, setMapColorBy, type MapColorBy } from "../../state";
import { renderLayoutMap } from "../../plots/layout-map";

export function initMapTile(): void {
  document.getElementById("map-color-by")?.addEventListener("change", (e) => {
    setMapColorBy((e.target as HTMLSelectElement).value as MapColorBy);
  });
}

export function updateMapTile(state: AppState): void {
  const sc = currentScenario(state);
  if (!sc) return;
  const select = document.getElementById("map-color-by") as HTMLSelectElement | null;
  if (select) select.value = state.mapColorBy;
  const el = document.getElementById("map-plot");
  if (!el) return;
  if (sc.turbines.some((t) => t.x !== null && t.y !== null)) {
    renderLayoutMap(el, sc, state.mapColorBy, state.projectSite);
  } else {
    el.textContent = "No turbine coordinates found in this report.";
  }
}
