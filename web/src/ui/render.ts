import type { AppState } from "../state";
import { currentScenario } from "../state";
import type { ParseDiagnostics } from "../parse/types";
import { reportMailto } from "../parse/report";
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
    renderReportBanner(errorEl, state.errorDiagnostics, state.filename, state.error);
    errorEl.hidden = false;
    empty.hidden = false;
    report.hidden = true;
    updateExportTile(false);
    return;
  }

  const sc = currentScenario(state);
  if (!sc) {
    errorEl.hidden = true;
    empty.hidden = false;
    report.hidden = true;
    updateExportTile(false);
    return;
  }

  // Loaded successfully, but a sheet may have parsed only totals — show a
  // non-blocking report notice above the data we did read.
  const diag = state.workbook?.diagnostics ?? null;
  if (diag) {
    renderReportBanner(errorEl, diag, state.filename, null);
    errorEl.hidden = false;
  } else {
    errorEl.hidden = true;
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

/**
 * Render the report banner. Two cases:
 *  - `error` set, no diagnostics → generic message (corrupt file, not a workbook).
 *  - diagnostics present → friendly notice + "Report this file" button that opens
 *    a pre-filled email. `error` distinguishes a hard failure (nothing parsed)
 *    from a partial parse (totals read, body sections unrecognised).
 */
function renderReportBanner(
  el: HTMLElement,
  diag: ParseDiagnostics | null,
  filename: string,
  error: string | null,
): void {
  el.textContent = "";

  if (!diag) {
    el.textContent = `Could not parse file: ${error}`;
    return;
  }

  const msg = document.createElement("p");
  msg.textContent = error
    ? "This file couldn't be read — it may come from a newer OpenWind version. Help us support it:"
    : "Some sections of this file weren't recognised — it may come from a newer OpenWind version. Help us support it:";
  el.appendChild(msg);

  const btn = document.createElement("a");
  btn.className = "report-btn";
  btn.textContent = "Report this file";
  btn.href = reportMailto(diag, filename);
  el.appendChild(btn);
}
