# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **static React + Vite + TypeScript single-page app** for designing and printing lab
"plate tag" labels on a **Zebra ZD621** thermal-transfer printer using **native ZPL**.
There is no backend — everything (UI, ZPL generation, QR encoding) runs in the browser.
Printing goes through **Zebra Browser Print** (a local helper app that exposes the printer
to page JS).

This replaced an earlier R Shiny + Julia (`PlateTags` package) app that rendered raster
PDFs; that stack has been removed. `data/plate_tags_template.csv` is the one artifact kept
from it (the batch CSV schema).

## Commands

```bash
npm install        # once
npm run dev        # dev server at http://localhost:5173
npm run build      # typecheck (tsc -b) + production build to dist/
npm run lint       # tsc --noEmit typecheck only
```

There is no test runner configured. To exercise the ZPL builder headlessly, run a small
script through `npx tsx` importing from `src/zpl/builder.ts` (imports use `.ts` extensions,
which `tsx` handles).

## Architecture

The data flow is: **template config + user input → `LabelData` → ZPL string → Browser Print**.

- **`src/labels/`** — the domain core.
  - `types.ts`: `LabelTemplate` (immutable product spec: dimensions in inches, dpi, and a
    list of `FieldSpec`s), `FieldSpec` (a text/qr/barcode/pdf417 element with inch
    coordinates), `LayoutOverride` (per-field nudge), and `LabelData` (a resolved label to
    print).
  - `templates.ts`: **`TEMPLATES` is the single source of truth** for label geometry — the
    three labtag.com products (cryotube/microplate/bottle), confirmed against real hardware
    (cryotube is 203 dpi; microplate/bottle are 300 dpi). Text fields specify `maxWidthIn`
    (a physical width budget) rather than a fixed character count — `resolveField`
    (`resolve.ts`) shrinks the font to fit at render/print time. A field's `noCodeLayout`
    gives it a wider `maxWidthIn` to expand into when the template's QR/barcode is toggled
    off. Updating this table is the only change needed to correct label layout.
  - `resolve.ts`: `resolveField` — the single field-resolution path used by **both**
    `zpl/builder.ts` (print) and `ui/LabelPreview.tsx` (preview), so they can't diverge. In
    order: applies `noCodeLayout` (if the code toggle is off), then the user's manual
    `LayoutOverride`, then auto-fits the font size (down to `MIN_FONT_SIZE_IN`, currently
    0.06″) to the current text before computing the resulting `maxChars`.

- **`src/zpl/`** — ZPL generation. `units.ts` converts inches→dots (`dots = inches × dpi`),
  so 203 vs 300 dpi is a one-line template switch. `elements.ts` emits ZPL fragments (`^FO`
  text, `^BQ` native QR, with `truncate`/`sanitizeFieldData`). `builder.ts` assembles
  `^XA…^XZ` blocks: it resolves each field via `resolveField`, resolves QR payloads **per
  copy** (so uuid-mode codes are unique per label), and sets `^PW`/`^LL` from template
  dimensions (emitting `^POI` instead of per-field coordinate reflection for `rotate: 180`
  templates — see the cryotube comment in `templates.ts` for why).

- **`src/qr/content.ts`** — resolves a QR field's payload: `"uuid"` (fresh uuid4 per label,
  matching the old backend) or `"field"` (a chosen field's value). A per-label `qrMode` on
  `LabelData` overrides the template's default.

- **`src/print/browserPrint.ts`** — wraps the global `window.BrowserPrint` (loaded via a
  `<script>` in `index.html`). `printZpl()` sends raw ZPL to the default printer.
  `isBrowserPrintAvailable()` gates the Print button; the app degrades to "Copy ZPL" when
  the SDK isn't present.

- **`src/batch/`** — `table.ts` is the `BatchRow` model (mirrors the CSV schema
  `count,QR,line_1..line_7`) and `rowToLabelData` maps a row onto a template's text
  fields. `csv.ts` (papaparse) imports/exports that schema.

- **`src/ui/`** — React components wired together in `App.tsx` (two tabs: Single, Batch).
  `LabelPreview.tsx` renders a **to-scale SVG** that mirrors the ZPL layout (using inches as
  the SVG viewBox units) and draws a real QR via the `qrcode` lib for on-screen preview only.

## Gotchas

- **`TEMPLATES` field ids matter**: text fields must be `line_1`, `line_2`, … to line up
  with the CSV batch schema and `rowToLabelData`'s positional mapping.
- **Switching template resets** values/overrides (`App.tsx::changeTemplate`) because field
  ids differ between templates.
- **Browser Print is not committed**: the `BrowserPrint-*.js` client and the Browser Print
  app are installed per workstation (see `public/README.md`); the file is gitignored.
- ZPL `^FD` data is sanitized (carets/tildes stripped) in `elements.ts`; keep that when
  adding new element types.
- The preview's pixels-per-inch (`PX_PER_IN` in `LabelPreview.tsx`) is a screen-scale
  constant, independent of the printer dpi used for ZPL.
- **Text sizing is dynamic, not static**: a `FieldSpec.size` for a text field is a ceiling,
  not the printed size — `resolveField` shrinks it to fit `maxWidthIn` for whatever the
  user typed (see `src/labels/resolve.ts`). Any code that needs "the" size/maxChars for a
  text field must go through `resolveField`, not read `field.size`/`field.maxChars`
  directly off the template.
