import * as XLSX from "xlsx";
import type {
  Cell, CurveMatrix, DirMatrix, Group, Mast, MiniTable, ParsedWorkbook,
  Scenario, Site, Turbine, TurbineType, WeibullRow, KV,
} from "./types";
import {
  binMid, cellStr, cleanNum, isBlankRow, isKvRow, isSingleCell,
  kvNum, kvStr, label, toKv,
} from "./grid";

export function parseWorkbook(data: ArrayBuffer): ParsedWorkbook {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(data, { type: "array" });
  } catch (err) {
    throw new Error(`not a readable Excel workbook (${String(err)})`);
  }
  const scenarios: Scenario[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) as Cell[][];
    const sc = parseSheet(rows, name);
    if (sc) scenarios.push(sc);
  }
  if (scenarios.length === 0) {
    throw new Error(
      "no OpenWind energy capture blocks recognised in this workbook. " +
      "Expected the Excel report written by an OpenWind energy capture operation."
    );
  }
  return { scenarios };
}

/* ── block segmentation ─────────────────────────────────────────────── */

type AnchorKind = "site" | "turbTable" | "ttype" | "mast";
interface Anchor { kind: AnchorKind; start: number; row: number }

function findAnchors(rows: Cell[][]): Anchor[] {
  const anchors: Anchor[] = [];
  for (let i = 0; i < rows.length; i++) {
    const a = label(rows[i]);
    const b = cellStr(rows[i][1] ?? null);
    if (a === "Site Name" && b === "Index") {
      anchors.push({ kind: "turbTable", start: i, row: i });
    } else if (a === "Site Name" && b !== "") {
      // Pull in the decorative title row above when it repeats the site name
      const start = i > 0 && isSingleCell(rows[i - 1]) && label(rows[i - 1]) === b ? i - 1 : i;
      anchors.push({ kind: "site", start, row: i });
    } else if (a.startsWith("Met Mast Layer")) {
      anchors.push({ kind: "mast", start: i, row: i });
    } else if (a.startsWith("Power Curve [")) {
      anchors.push({ kind: "ttype", start: findTypeTitle(rows, i) ?? i, row: i });
    }
  }
  return anchors;
}

/** Walk back from a "Power Curve [kWh]" row to the turbine-type title above "Comments:". */
function findTypeTitle(rows: Cell[][], pcRow: number): number | null {
  for (let j = pcRow - 1; j >= Math.max(0, pcRow - 60); j--) {
    if (label(rows[j]) === "Comments:") {
      for (let k = j - 1; k >= Math.max(0, j - 6); k--) {
        if (!isBlankRow(rows[k]) && isSingleCell(rows[k])) return k;
      }
      return null;
    }
    if (label(rows[j]).startsWith("Power Curve [")) return null; // ran into previous block
  }
  return null;
}

/* ── sheet parser ───────────────────────────────────────────────────── */

function parseSheet(rows: Cell[][], sheetName: string): Scenario | null {
  const anchors = findAnchors(rows);

  // External-layer rows can appear anywhere (header region or between blocks)
  const externalLayers: string[] = [];
  for (const row of rows) {
    if (label(row).startsWith("Enabled External Site Layer")) {
      const v = cellStr(row[1] ?? null);
      if (v && !externalLayers.includes(v)) externalLayers.push(v);
    }
  }

  const headerEnd = anchors.length ? anchors[0].start : rows.length;
  const { groups, dateNote } = parseHeaderRegion(rows, headerEnd);
  const allHeaderKvs = groups.flatMap((g) => g.kvs);

  const scenario: Scenario = {
    sheetName,
    meta: {
      version: kvStr(allHeaderKvs, "Openwind Version"),
      licensedTo: kvStr(allHeaderKvs, "Licensed to"),
      epsg: kvStr(allHeaderKvs, "EPSG"),
      projection: kvStr(allHeaderKvs, "Projection"),
      datum: kvStr(allHeaderKvs, "Mapping Datum"),
      timeZone: kvStr(allHeaderKvs, "Time Zone"),
      date: dateNote,
    },
    totals: {
      idealGwh: kvNum(allHeaderKvs, "Ideal Energy"),
      theoGrossGwh: kvNum(allHeaderKvs, "Theoretical Gross Energy"),
      grossGwh: kvNum(allHeaderKvs, "Gross Energy"),
      netGwh: kvNum(allHeaderKvs, "Net Energy"),
      cf: kvNum(allHeaderKvs, "Capacity Factor"),
      topoEff: kvNum(allHeaderKvs, "Topographic Efficiency"),
      arrayEff: kvNum(allHeaderKvs, "Array Efficiency"),
    },
    groups,
    externalLayers,
    sites: [],
    turbines: [],
    turbineTypes: [],
    masts: [],
    turbineTableHeader: [],
  };

  for (let k = 0; k < anchors.length; k++) {
    const a = anchors[k];
    const end = k + 1 < anchors.length ? anchors[k + 1].start : rows.length;
    if (a.kind === "site") {
      scenario.sites.push(parseSite(rows, a.row, end));
    } else if (a.kind === "turbTable") {
      const { header, turbines } = parseTurbineTable(rows, a.row, end);
      if (header.length > scenario.turbineTableHeader.length) scenario.turbineTableHeader = header;
      scenario.turbines.push(...turbines);
    } else if (a.kind === "ttype") {
      scenario.turbineTypes.push(parseTurbineType(rows, a.start, end));
    } else {
      scenario.masts.push(parseMast(rows, a.row, end));
    }
  }

  // Attach turbines to sites; create implicit sites for orphan names
  const byName = new Map(scenario.sites.map((s) => [s.name, s]));
  for (const t of scenario.turbines) {
    let site = byName.get(t.site);
    if (!site) {
      site = emptySite(t.site);
      byName.set(t.site, site);
      scenario.sites.push(site);
    }
    site.turbines.push(t);
  }

  const hasContent =
    scenario.sites.length > 0 || scenario.turbines.length > 0 ||
    scenario.masts.length > 0 || scenario.turbineTypes.length > 0 ||
    scenario.totals.netGwh !== null || scenario.totals.grossGwh !== null;
  return hasContent ? scenario : null;
}

/* ── header region (metadata, settings, losses) ─────────────────────── */

function parseHeaderRegion(rows: Cell[][], end: number): { groups: Group[]; dateNote: string | null } {
  const groups: Group[] = [];
  let cur: Group = { title: "Report", kvs: [], notes: [] };
  let dateNote: string | null = null;
  const push = () => { if (cur.kvs.length || cur.notes.length) groups.push(cur); };

  for (let i = 0; i < end; i++) {
    const row = rows[i];
    if (isBlankRow(row)) continue;
    if (label(row).startsWith("Enabled External Site Layer")) continue; // collected globally
    if (isKvRow(row)) {
      cur.kvs.push(toKv(row));
    } else if (isSingleCell(row)) {
      const text = label(row);
      if (row[0] instanceof Date || /^[A-Za-z]+ \d{1,2}, \d{4}/.test(text)) {
        dateNote = text;
        continue;
      }
      let j = i + 1;
      while (j < end && isBlankRow(rows[j])) j++;
      if (j < end && isKvRow(rows[j])) {
        push();
        cur = { title: text, kvs: [], notes: [] };
      } else {
        cur.notes.push(text);
      }
    }
  }
  push();
  return { groups, dateNote };
}

/* ── site summary block ─────────────────────────────────────────────── */

function emptySite(name: string): Site {
  return {
    name, kvs: [], notes: [], turbines: [],
    nTurbines: null, mw: null, idealGwh: null, theoGrossGwh: null, grossGwh: null,
    netGwh: null, cf: null, topoEff: null, arrayEff: null, meanFreeSpeed: null,
  };
}

function parseSite(rows: Cell[][], start: number, end: number): Site {
  const kvs: KV[] = [];
  const notes: string[] = [];
  for (let i = start; i < end; i++) {
    const row = rows[i];
    if (isBlankRow(row)) continue;
    if (isKvRow(row)) kvs.push(toKv(row));
    else if (isSingleCell(row)) notes.push(label(row));
  }
  const site = emptySite(kvStr(kvs, "Site Name") ?? label(rows[start]));
  site.kvs = kvs;
  site.notes = notes;
  site.nTurbines = kvNum(kvs, "Turbines");
  site.mw = kvNum(kvs, "MW");
  site.idealGwh = kvNum(kvs, "Ideal Energy");
  site.theoGrossGwh = kvNum(kvs, "Theoretical Gross Energy");
  site.grossGwh = kvNum(kvs, "Gross Energy");
  site.netGwh = kvNum(kvs, "Net Energy");
  site.cf = kvNum(kvs, "Capacity Factor");
  site.topoEff = kvNum(kvs, "Topographic Efficiency");
  site.arrayEff = kvNum(kvs, "Array Efficiency");
  site.meanFreeSpeed = kvNum(kvs, "Mean Free Wind Speed At Turbines");
  return site;
}

/* ── per-turbine table ──────────────────────────────────────────────── */

function parseTurbineTable(rows: Cell[][], headerRow: number, end: number): { header: string[]; turbines: Turbine[] } {
  const headerCells = rows[headerRow].map((c) => cellStr(c));
  let last = headerCells.length - 1;
  while (last >= 0 && headerCells[last] === "") last--;
  const header = headerCells.slice(0, last + 1);

  const col = (prefix: string): number => {
    const p = prefix.toLowerCase();
    return header.findIndex((h) => h.toLowerCase().startsWith(p));
  };
  const cols = {
    index: col("Index"), label: col("Label"), x: col("X ["), y: col("Y ["),
    type: col("Turbine Type"), hub: col("Hub Height"), rotor: col("Rotor Diameter"),
    cap: col("Capacity [k"), elev: col("Terrain Elevation"), free: col("Mean Free"),
    waked: col("Mean Wake"), ideal: col("Ideal Yield"), theo: col("Theoretical Gross"),
    gross: col("Gross Yield"), array: col("Array Yield"), net: col("Net Yield"),
    cf: col("Capacity Factor"), topo: col("Topographic Eff"), arrEff: col("Array Eff"),
  };
  const num = (row: Cell[], c: number): number | null => (c < 0 ? null : cleanNum(row[c] ?? null));
  const str = (row: Cell[], c: number): string | null => {
    if (c < 0) return null;
    const v = cellStr(row[c] ?? null);
    return v === "" || v === "N/A" ? null : v;
  };

  const turbines: Turbine[] = [];
  for (let i = headerRow + 1; i < end; i++) {
    const row = rows[i];
    if (isBlankRow(row) || cellStr(row[0]) === "") break;
    const raw: Record<string, Cell> = {};
    header.forEach((h, c) => { if (h) raw[h] = row[c] ?? null; });
    turbines.push({
      site: cellStr(row[0]),
      index: num(row, cols.index),
      label: str(row, cols.label),
      x: num(row, cols.x), y: num(row, cols.y),
      type: str(row, cols.type),
      hubHeight: num(row, cols.hub),
      rotorDiameter: num(row, cols.rotor),
      capacityKw: num(row, cols.cap),
      elevation: num(row, cols.elev),
      meanFree: num(row, cols.free),
      meanWaked: num(row, cols.waked),
      idealMwh: num(row, cols.ideal),
      theoGrossMwh: num(row, cols.theo),
      grossMwh: num(row, cols.gross),
      arrayMwh: num(row, cols.array),
      netMwh: num(row, cols.net),
      cf: num(row, cols.cf),
      topoEff: num(row, cols.topo),
      arrayEff: num(row, cols.arrEff),
      raw,
    });
  }
  return { header, turbines };
}

/* ── turbine type block ─────────────────────────────────────────────── */

function parseTurbineType(rows: Cell[][], start: number, end: number): TurbineType {
  const t: TurbineType = {
    name: isSingleCell(rows[start]) ? label(rows[start]) : "Turbine type",
    comments: [], specs: [], power: null, thrust: null, rpm: null,
    sections: [], tables: [],
    capacityKw: null, diameter: null, hubHeight: null, cutIn: null, cutOut: null,
  };
  let section: Group | null = null;
  let inComments = false;
  let i = start + 1;

  while (i < end) {
    const row = rows[i];
    const a = label(row);
    if (isBlankRow(row)) { i++; continue; }

    if (a === "Comments:") { inComments = true; i++; continue; }
    if (a.startsWith("Power Curve [")) { [t.power, i] = parseCurve(rows, i + 1, end, t.specs); continue; }
    if (a === "Thrust Curve") { [t.thrust, i] = parseCurve(rows, i + 1, end, t.specs); continue; }
    if (a === "RPM Curve") { [t.rpm, i] = parseCurve(rows, i + 1, end, t.specs); continue; }

    if (isKvRow(row)) {
      inComments = false;
      if (section) section.kvs.push(toKv(row));
      else t.specs.push(toKv(row));
    } else if (isSingleCell(row)) {
      if (inComments) {
        t.comments.push(a);
      } else if (a.endsWith(".") || a.length > 40) {
        // sentence-like -> note ("Temperature shutdown disabled.")
        if (section) section.notes.push(a);
        else t.comments.push(a);
      } else {
        if (section && (section.kvs.length || section.notes.length)) t.sections.push(section);
        section = { title: a, kvs: [], notes: [] };
      }
    }
    i++;
  }
  if (section && (section.kvs.length || section.notes.length)) t.sections.push(section);

  t.capacityKw = kvNum(t.specs, "Capacity");
  t.diameter = kvNum(t.specs, "Diameter");
  t.hubHeight = kvNum(t.specs, "Hub Height");
  t.cutIn = kvNum(t.specs, "Cut in");
  t.cutOut = kvNum(t.specs, "Cut Out");
  return t;
}

/**
 * Parse a "Windspeed \ Air Density" matrix. Leading KV rows (TI min/max)
 * are folded into `leadingKvs`. Returns [curve, nextRowIndex].
 */
function parseCurve(rows: Cell[][], from: number, end: number, leadingKvs: KV[]): [CurveMatrix | null, number] {
  let i = from;
  while (i < end) {
    const row = rows[i];
    if (isBlankRow(row)) { i++; continue; }
    if (label(row).startsWith("Windspeed")) break;
    if (isKvRow(row)) { leadingKvs.push(toKv(row)); i++; continue; }
    return [null, i]; // unexpected content; bail without consuming it
  }
  if (i >= end) return [null, i];

  const headerRow = rows[i];
  const densities: number[] = [];
  const densityCols: number[] = [];
  headerRow.forEach((c, ci) => {
    if (ci === 0) return;
    const n = cleanNum(c);
    if (n !== null) { densities.push(n); densityCols.push(ci); }
  });
  const speeds: number[] = [];
  const values: (number | null)[][] = [];
  i++;
  while (i < end) {
    const row = rows[i];
    const s = cleanNum(row[0] ?? null);
    if (s === null) break;
    speeds.push(s);
    values.push(densityCols.map((ci) => cleanNum(row[ci] ?? null)));
    i++;
  }
  if (speeds.length === 0) return [null, i];
  return [{ densities, speeds, values }, i];
}

/* ── met mast block ─────────────────────────────────────────────────── */

function parseMast(rows: Cell[][], start: number, end: number): Mast {
  const m: Mast = {
    name: label(rows[start]).replace(/^Met Mast Layer:\s*/i, ""),
    height: null, x: null, y: null,
    kvs: [], notes: [], tables: [], freq: null, ti: null, weibull: [],
  };

  let i = start + 1;
  while (i < end) {
    const row = rows[i];
    const a = label(row);
    if (isBlankRow(row)) { i++; continue; }

    if (a.startsWith("Frequency Table")) { [m.freq, i] = parseDirMatrix(rows, i + 1, end); continue; }
    if (a.startsWith("Turbulence Intensity Table")) { [m.ti, i] = parseDirMatrix(rows, i + 1, end); continue; }
    if (a.startsWith("Weibull Table")) { i = parseWeibull(rows, i + 1, end, m.weibull); continue; }
    if (a.startsWith("Height [m]")) { i = parseMiniTable(rows, i, end, "Heights", m.tables); continue; }
    if (a.startsWith("Stdev")) { i = parseMiniTable(rows, i + 1, end, a, m.tables); continue; }

    if (a.startsWith("X [")) {
      m.x = cleanNum(row[1] ?? null);
      m.y = cleanNum(row[3] ?? null);
      const extra = cellStr(row[4] ?? null);
      if (extra) m.notes.push(extra);
    } else if (isKvRow(row)) {
      m.kvs.push(toKv(row));
    } else if (isSingleCell(row)) {
      m.notes.push(a);
    }
    i++;
  }
  m.height = kvNum(m.kvs, "Current Height");
  return m;
}

/** Generic small table: header row + data rows whose first cell is a number or bin label. */
function parseMiniTable(rows: Cell[][], headerRow: number, end: number, title: string, out: MiniTable[]): number {
  const header = rows[headerRow].map(cellStr);
  let last = header.length - 1;
  while (last >= 0 && header[last] === "") last--;
  const table: MiniTable = { title, header: header.slice(0, last + 1), rows: [] };
  let i = headerRow + 1;
  while (i < end) {
    const row = rows[i];
    const a = label(row);
    if (isBlankRow(row)) break;
    if (cleanNum(row[0] ?? null) === null && binMid(a) === null) break;
    table.rows.push(row.slice(0, table.header.length));
    i++;
  }
  if (table.rows.length) out.push(table);
  return i;
}

function parseDirMatrix(rows: Cell[][], from: number, end: number): [DirMatrix | null, number] {
  let i = from;
  while (i < end && (isBlankRow(rows[i]) || !/^Speed\s*[\\/]/.test(label(rows[i])))) {
    if (!isBlankRow(rows[i])) return [null, i];
    i++;
  }
  if (i >= end) return [null, i];

  const headerRow = rows[i];
  const dirs: number[] = [];
  const dirCols: number[] = [];
  headerRow.forEach((c, ci) => {
    if (ci === 0) return;
    const n = cleanNum(c);
    if (n !== null) { dirs.push(n); dirCols.push(ci); }
  });

  const speedLabels: string[] = [];
  const speedMid: number[] = [];
  const values: number[][] = [];
  i++;
  while (i < end) {
    const row = rows[i];
    const mid = binMid(label(row));
    if (mid === null) break;
    speedLabels.push(label(row));
    speedMid.push(mid);
    values.push(dirCols.map((ci) => cleanNum(row[ci] ?? null) ?? 0));
    i++;
  }
  if (speedMid.length === 0) return [null, i];
  return [{ dirs, speedLabels, speedMid, values }, i];
}

function parseWeibull(rows: Cell[][], from: number, end: number, out: WeibullRow[]): number {
  let i = from;
  // optional header row ("Sector | Degrees | P [%] | ...")
  if (i < end && label(rows[i]) === "Sector") i++;
  while (i < end) {
    const row = rows[i];
    const sector = cleanNum(row[0] ?? null);
    if (sector === null) break;
    out.push({
      sector,
      degrees: cellStr(row[1] ?? null),
      p: cleanNum(row[2] ?? null),
      a: cleanNum(row[3] ?? null),
      k: cleanNum(row[4] ?? null),
      mean: cleanNum(row[5] ?? null),
      energyPct: cleanNum(row[6] ?? null),
    });
    i++;
  }
  return i;
}
