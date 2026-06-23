import type { ParseDiagnostics } from "./types";

const SUPPORT_EMAIL = "sebastian@anemona.io";

/**
 * Build a `mailto:` URL that opens the user's email client pre-filled with the
 * technical diagnostics a maintainer needs to register a renamed OpenWind label.
 * The file itself is never embedded — we only ask the user to attach it.
 */
export function reportMailto(diag: ParseDiagnostics, filename: string): string {
  const version = diag.version ?? "unknown";
  const subject = `OWview parse report — OpenWind ${version}`;

  const body = [
    "Hi — the OpenWind viewer could not read this export.",
    "",
    "Please attach the .xlsx file to this email so it can be fixed.",
    "(The viewer never uploads the file; this report only contains labels.)",
    "",
    "── Technical details ──",
    `File: ${filename || "(unknown)"}`,
    `OpenWind version: ${version}`,
    `Sheets: ${diag.sheetNames.join(", ") || "(none)"}`,
    "",
    "Labels found in column A:",
    ...diag.labelsSeen.map((l) => `  • ${l}`),
  ].join("\n");

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
