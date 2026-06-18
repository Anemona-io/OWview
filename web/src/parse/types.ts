export type Cell = string | number | boolean | Date | null;

/** One "Label | value" row. `num` is the cleaned numeric value when the cell is a usable number. */
export interface KV {
  key: string;
  value: string;
  num: number | null;
}

/** A titled run of key-value rows (settings, losses, wake params, ...). */
export interface Group {
  title: string;
  kvs: KV[];
  notes: string[];
}

/** A small generic table kept for display/JSON (mast heights, costs, ...). */
export interface MiniTable {
  title: string;
  header: string[];
  rows: Cell[][];
}

export interface Turbine {
  site: string;
  index: number | null;
  label: string | null;
  x: number | null;
  y: number | null;
  type: string | null;
  hubHeight: number | null;
  rotorDiameter: number | null;
  capacityKw: number | null;
  elevation: number | null;
  meanFree: number | null;
  meanWaked: number | null;
  idealMwh: number | null;
  theoGrossMwh: number | null;
  grossMwh: number | null;
  arrayMwh: number | null;
  netMwh: number | null;
  cf: number | null;
  topoEff: number | null;
  arrayEff: number | null;
  raw: Record<string, Cell>;
}

export interface Site {
  name: string;
  kvs: KV[];
  notes: string[];
  turbines: Turbine[];
  nTurbines: number | null;
  mw: number | null;
  idealGwh: number | null;
  theoGrossGwh: number | null;
  grossGwh: number | null;
  netGwh: number | null;
  cf: number | null;
  topoEff: number | null;
  arrayEff: number | null;
  meanFreeSpeed: number | null;
}

/** Wind-speed-indexed curve, one column per air density. */
export interface CurveMatrix {
  densities: number[];
  speeds: number[];
  /** values[speedIdx][densityIdx] */
  values: (number | null)[][];
}

export interface TurbineType {
  name: string;
  comments: string[];
  specs: KV[];
  power: CurveMatrix | null;
  thrust: CurveMatrix | null;
  rpm: CurveMatrix | null;
  sections: Group[];
  tables: MiniTable[];
  capacityKw: number | null;
  diameter: number | null;
  hubHeight: number | null;
  cutIn: number | null;
  cutOut: number | null;
}

/** Speed-bin x direction-sector matrix (frequency or TI). */
export interface DirMatrix {
  dirs: number[];
  speedLabels: string[];
  speedMid: number[];
  /** values[speedIdx][dirIdx] */
  values: number[][];
}

export interface WeibullRow {
  sector: number;
  degrees: string;
  p: number | null;
  a: number | null;
  k: number | null;
  mean: number | null;
  energyPct: number | null;
}

export interface Mast {
  name: string;
  height: number | null;
  x: number | null;
  y: number | null;
  kvs: KV[];
  notes: string[];
  tables: MiniTable[];
  freq: DirMatrix | null;
  ti: DirMatrix | null;
  weibull: WeibullRow[];
}

export interface ScenarioMeta {
  version: string | null;
  licensedTo: string | null;
  epsg: string | null;
  projection: string | null;
  datum: string | null;
  timeZone: string | null;
  date: string | null;
}

export interface ScenarioTotals {
  idealGwh: number | null;
  theoGrossGwh: number | null;
  grossGwh: number | null;
  netGwh: number | null;
  cf: number | null;
  topoEff: number | null;
  arrayEff: number | null;
}

export interface Scenario {
  sheetName: string;
  meta: ScenarioMeta;
  totals: ScenarioTotals;
  groups: Group[];
  externalLayers: string[];
  sites: Site[];
  turbines: Turbine[];
  turbineTypes: TurbineType[];
  masts: Mast[];
  /** Header of the per-turbine table, used for CSV export. */
  turbineTableHeader: string[];
}

export interface ParsedWorkbook {
  scenarios: Scenario[];
}
