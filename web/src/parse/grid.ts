import type { Cell, KV } from "./types";

/** OpenWind writes -999 and ~3.3e+36 as "no data" sentinels. */
export function cleanNum(v: Cell): number | null {
  if (typeof v !== "number" || !isFinite(v)) return null;
  if (Math.abs(v) >= 1e30) return null;
  if (Math.abs(v + 999) < 1e-9) return null;
  return v;
}

export function cellStr(v: Cell): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toLocaleString();
  return String(v).trim();
}

export function label(row: Cell[]): string {
  return cellStr(row[0]);
}

export function isBlankRow(row: Cell[]): boolean {
  return row.every((c) => c == null || cellStr(c) === "");
}

/** Row with a label in col A and at least one value to the right. */
export function isKvRow(row: Cell[]): boolean {
  if (label(row) === "") return false;
  return row.slice(1).some((c) => c != null && cellStr(c) !== "");
}

/** Row with only col A populated. */
export function isSingleCell(row: Cell[]): boolean {
  return label(row) !== "" && row.slice(1).every((c) => c == null || cellStr(c) === "");
}

/**
 * Build a KV from a row. Range rows like "Temperature | 4.4 | to | 4.6"
 * become value "4.4 to 4.6"; other extra cells are joined with spaces.
 */
export function toKv(row: Cell[]): KV {
  const key = label(row);
  const rest = row.slice(1).filter((c) => c != null && cellStr(c) !== "");
  const value = rest.map(cellStr).join(" ");
  const num = rest.length === 1 ? cleanNum(rest[0]) : null;
  return { key, value, num };
}

export function findKv(kvs: KV[], prefix: string): KV | undefined {
  const p = prefix.toLowerCase();
  return kvs.find((kv) => kv.key.toLowerCase().startsWith(p));
}

export function kvNum(kvs: KV[], prefix: string): number | null {
  const kv = findKv(kvs, prefix);
  return kv ? kv.num : null;
}

export function kvStr(kvs: KV[], prefix: string): string | null {
  const kv = findKv(kvs, prefix);
  return kv ? kv.value : null;
}

/** "  8.5-9.5 " -> 9, " 0-0.5" -> 0.25; null when the label is not a bin. */
export function binMid(labelText: string): number | null {
  const m = labelText.trim().match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  return (parseFloat(m[1]) + parseFloat(m[2])) / 2;
}
