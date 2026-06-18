# OWview

OWview is a browser-based viewer for the Excel report written by a UL OpenWind energy capture run. The file is parsed and rendered locally; nothing is uploaded to a server.

It renders project totals and the ideal-to-net energy cascade, a turbine layout map, per-site and per-turbine yields with wake losses, turbine power and thrust curves, and the met-mast wind climates used in the run (wind rose, joint-probability heatmap, sector Weibull fits, and turbulence intensity).

## Run locally

```bash
cd web
npm install
npm run dev
```

Vite dev server at `http://localhost:5173`.

## Build

```bash
cd web
npm run build   # output goes to web/dist/
```

The `web/dist/` output is a static site that can be served by any static host.

## What it reads

The single- or multi-sheet workbook written by an OpenWind *energy capture* operation. Each sheet is parsed as one scenario:

- report header (version, projection/EPSG, time zone, date)
- project totals (ideal / theoretical gross / gross / net energy, CF, efficiencies)
- energy capture parameters, global losses, wake model & induction settings
- per-site summary blocks and the full per-turbine results table
- turbine type blocks with power / thrust / RPM curves
- met mast blocks: frequency table, turbulence intensity table, sector Weibull fits

The parser is tolerant: unrecognised blocks are skipped, and OpenWind's placeholder values (`-999`, `N/A`, and overflow values such as `3.3e+36`) are treated as blanks. Full reference at `/docs.html` in the app.

OWview is an independent open-source tool and is not affiliated with UL Solutions.

## License

MIT © Anemona.io
