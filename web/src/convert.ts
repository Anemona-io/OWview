import type { Scenario } from "./parse/types";
import { cellStr } from "./parse/grid";

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Per-turbine table as CSV, with every column OpenWind wrote. */
export function turbinesCsv(sc: Scenario): string {
  const header = sc.turbineTableHeader.length
    ? sc.turbineTableHeader
    : ["Site Name", "Index", "X [m]", "Y [m]", "Net Yield [MWh]"];
  const lines = [header.map(csvEscape).join(",")];
  for (const t of sc.turbines) {
    lines.push(header.map((h) => csvEscape(cellStr(t.raw[h] ?? null))).join(","));
  }
  return lines.join("\n") + "\n";
}

export function scenarioJson(sc: Scenario): string {
  return JSON.stringify(sc, null, 2);
}

export function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function fileStem(name: string): string {
  return name.replace(/\.[^.]+$/, "") || "owview";
}
