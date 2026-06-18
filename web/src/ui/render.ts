import type { AppState } from "../state";
import { currentScenario } from "../state";
import { updateNav } from "./nav";
import { updateOverview } from "./tiles/overview";
import { updateCompareTile } from "./tiles/compare-tile";
import { updateMapTile } from "./tiles/map-tile";
import { updateSitesTile } from "./tiles/sites-tile";
import { updateTurbinesTile } from "./tiles/turbines-tile";
import { updateTypesTile } from "./tiles/types-tile";
import { updateMastsTile } from "./tiles/masts-tile";
import { updateSettingsTile } from "./tiles/settings-tile";
import { updateExportTile } from "./tiles/export-tile";

export function render(state: AppState): void {
  const empty = document.getElementById("empty-state")!;
  const errorEl = document.getElementById("error-banner")!;
  const report = document.getElementById("report")!;

  updateNav(state);

  if (state.error) {
    errorEl.textContent = `Could not parse file: ${state.error}`;
    errorEl.hidden = false;
    empty.hidden = false;
    report.hidden = true;
    updateExportTile(false);
    return;
  }
  errorEl.hidden = true;

  const sc = currentScenario(state);
  if (!sc) {
    empty.hidden = false;
    report.hidden = true;
    updateExportTile(false);
    return;
  }

  empty.hidden = true;
  report.hidden = false;

  updateOverview(sc, state.projectSite);
  updateCompareTile(state);
  updateMapTile(state);
  updateSitesTile(sc, state.projectSite);
  updateTurbinesTile(state);
  updateTypesTile(state);
  updateMastsTile(state);
  updateSettingsTile(sc);
  updateExportTile(true);
}
