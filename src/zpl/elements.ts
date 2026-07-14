// ZPL element helpers. Each returns a ZPL fragment string. Positions are in dots.
// Callers convert inches -> dots via units.ts before calling these.

import bwipjs from "bwip-js/browser";
import type { ZplFont } from "../labels/types";
import { fontHeightDots, inchesToDots } from "./units";

/**
 * ZPL field orientation: N=normal, R=rotated 90° clockwise, I=inverted 180°,
 * B=rotated 270° (bottom-up). Used to rotate a whole label's content when the
 * media feeds in a different orientation than the design is authored in.
 */
export type ZplOrientation = "N" | "R" | "I" | "B";

/**
 * Escape a field's data for ZPL ^FD. The caret (^), tilde (~), and comma have
 * special meaning; the cleanest portable approach is ZPL's ^FH hex escaping for
 * the control chars. We keep it simple: strip carets/tildes which cannot appear
 * literally in a plain ^FD, and leave the rest. Field data terminates at ^FS.
 */
export function sanitizeFieldData(text: string): string {
  return text.replace(/[\^~]/g, " ");
}

/**
 * Truncate to maxChars, marking an over-length value with a single trailing "+"
 * (the "+" occupies the last allotted character, so the result never exceeds
 * maxChars).
 */
export function truncate(text: string, maxChars?: number): string {
  if (!maxChars || text.length <= maxChars) return text;
  if (maxChars < 1) return text.slice(0, maxChars);
  return text.slice(0, maxChars - 1) + "+";
}

/**
 * A scalable-font text field: ^FO x,y ^A0N,h,w ^FD text ^FS
 *
 * When `align` is "center", the text is centered within a `blockWidthIn`-wide
 * block starting at `x`, using ZPL's ^FB (field block) with centered
 * justification: ^FB<width>,1,0,C. Left alignment (default) omits ^FB.
 */
export function textElement(opts: {
  xIn: number;
  yIn: number;
  sizeIn: number;
  text: string;
  dpi: number;
  font?: ZplFont;
  maxChars?: number;
  align?: "left" | "center";
  blockWidthIn?: number;
  orientation?: ZplOrientation;
}): string {
  const x = inchesToDots(opts.xIn, opts.dpi);
  const y = inchesToDots(opts.yIn, opts.dpi);
  const h = fontHeightDots(opts.sizeIn, opts.dpi);
  const font = opts.font ?? "0";
  const o = opts.orientation ?? "N";
  const data = sanitizeFieldData(truncate(opts.text, opts.maxChars));
  // ^A<font><orientation>,height,width (0 width = proportional).
  const fontCmd = `^A${font}${o},${h},${h}`;
  if (opts.align === "center" && opts.blockWidthIn) {
    const blockDots = inchesToDots(opts.blockWidthIn, opts.dpi);
    // ^FB width,maxLines(1),lineSpacing(0),justification(C=center).
    return `^FO${x},${y}${fontCmd}^FB${blockDots},1,0,C^FD${data}^FS`;
  }
  return `^FO${x},${y}${fontCmd}^FD${data}^FS`;
}

/**
 * A native ZPL QR code: ^FO x,y ^BQN,2,<mag> ^FD <error>A,<data> ^FS
 * `mag` is the module magnification (integer). `errorLevel` defaults to M.
 */
export function qrElement(opts: {
  xIn: number;
  yIn: number;
  magnification: number;
  data: string;
  dpi: number;
  errorLevel?: "L" | "M" | "Q" | "H";
  orientation?: ZplOrientation;
}): string {
  const x = inchesToDots(opts.xIn, opts.dpi);
  const y = inchesToDots(opts.yIn, opts.dpi);
  const mag = Math.max(1, Math.round(opts.magnification));
  const err = opts.errorLevel ?? "M";
  const o = opts.orientation ?? "N";
  const data = sanitizeFieldData(opts.data);
  // ^BQ<orientation>,2,mag ; ^FD <errorLevel><mask>A,<data>  (A = alphanumeric auto)
  return `^FO${x},${y}^BQ${o},2,${mag}^FD${err}A,${data}^FS`;
}

/**
 * A native ZPL Code128 barcode: ^BY sets the module (narrow-bar) width, then
 * ^FO x,y ^BCN,<height>,<showText>,N,N ^FD <data> ^FS.
 *
 * Code128 width scales with data length: total width ≈ modules × moduleDots,
 * where modules ≈ 11 × (chars + overhead). We derive the module width in dots
 * from the requested total width so the barcode fits its allotted space, and
 * clamp it to the printer's minimum of 2 dots.
 */
export function barcodeElement(opts: {
  xIn: number;
  yIn: number;
  /** Bar height in inches. */
  heightIn: number;
  /** Total barcode width budget in inches. */
  widthIn: number;
  data: string;
  dpi: number;
  showText?: boolean;
  orientation?: ZplOrientation;
}): string {
  const x = inchesToDots(opts.xIn, opts.dpi);
  const y = inchesToDots(opts.yIn, opts.dpi);
  const heightDots = Math.max(1, inchesToDots(opts.heightIn, opts.dpi));
  const o = opts.orientation ?? "N";
  const data = sanitizeFieldData(opts.data);
  // Approximate module count for Code128: 11 modules per char + ~35 for
  // start/checksum/stop/quiet. Choose the largest module width that still fits.
  const modules = 11 * data.length + 35;
  const totalDots = inchesToDots(opts.widthIn, opts.dpi);
  const moduleDots = Math.max(2, Math.floor(totalDots / modules));
  const showText = opts.showText ? "Y" : "N";
  // ^BY<moduleWidth> ; ^BC<orientation>,height,printInterpretationLine,...,N (no UCC check)
  return `^BY${moduleDots}^FO${x},${y}^BC${o},${heightDots},${showText},N,N^FD${data}^FS`;
}

/**
 * The real PDF417 module grid for `data` at (at most) `targetRows` rows, found
 * by asking bwip-js's encoder (not a guess) how wide the symbol needs to be at
 * each column count, starting from 1 and stopping once the row count fits the
 * target. bwip-js's `pixy` is always a multiple of 3 dots per data row.
 *
 * If no column count up to the ZPL max (30) achieves `targetRows` (only
 * possible with unusually long "field"-mode custom text), returns the
 * columns=30 result with whatever larger row count that actually needs,
 * rather than pretending it fits — the caller uses the real row count instead
 * of `targetRows` in that case, so the output stays geometrically valid.
 * Returns null if bwip-js can't encode `data` at all (e.g. empty string).
 */
function pdf417Grid(
  data: string,
  targetRows: number,
): { columns: number; rows: number; pixx: number } | null {
  try {
    let last: { columns: number; rows: number; pixx: number } | null = null;
    for (let columns = 1; columns <= 30; columns++) {
      // `columns` isn't in bwip-js's generic RawOptions type (it's a
      // BWIPP-specific pdf417 option) — assigning to a variable first avoids
      // TS's excess-property check on the object literal.
      const rawOpts = { bcid: "pdf417", text: data, columns };
      const raw = bwipjs.raw(rawOpts)[0] as { pixx: number; pixy: number };
      last = { columns, rows: Math.round(raw.pixy / 3), pixx: raw.pixx };
      if (last.rows <= targetRows) return last;
    }
    return last;
  } catch {
    return null;
  }
}

/**
 * A native ZPL PDF417 barcode: ^BY sets the module width, then
 * ^FO x,y ^B7,<rowHeight>,<security>,<cols>,<rows>,N ^FD <data> ^FS.
 *
 * PDF417 is a 2D stacked symbology — it wraps data across `rows`, so it holds a
 * long payload (e.g. a UUID) in a bounded footprint rather than growing purely
 * wider like Code128. `rowHeight` is the height of one row in dots; total code
 * height ≈ rowHeight × rows.
 *
 * Module width and column count come from `pdf417Grid`'s real encoding of the
 * data — not a guessed modules-per-width ratio — and are passed to `^B7`
 * explicitly (not auto-columns), so the printed size is deterministic and
 * actually matches the width/height budget. A too-small `rows` for a long
 * payload (e.g. a full uuid squeezed into 3 rows) would otherwise force many
 * more columns than expected and overflow the budget entirely; `pdf417Grid`
 * surfaces the real row count needed instead of silently overflowing.
 */
export function pdf417Element(opts: {
  xIn: number;
  yIn: number;
  /** Total code height budget in inches. */
  heightIn: number;
  /** Total code width budget in inches (drives the module width). */
  widthIn: number;
  data: string;
  dpi: number;
  /** Number of data rows (3–90). Defaults to 3 (minimum for a short label). */
  rows?: number;
  orientation?: ZplOrientation;
}): string {
  const x = inchesToDots(opts.xIn, opts.dpi);
  const y = inchesToDots(opts.yIn, opts.dpi);
  const o = opts.orientation ?? "N";
  const data = sanitizeFieldData(opts.data);
  const targetRows = Math.min(90, Math.max(3, Math.round(opts.rows ?? 3)));
  const widthBudgetDots = inchesToDots(opts.widthIn, opts.dpi);

  const grid = pdf417Grid(data, targetRows);
  let columns: number;
  let rows: number;
  let moduleDots: number;
  if (grid) {
    columns = grid.columns;
    rows = Math.min(90, Math.max(3, grid.rows));
    moduleDots = Math.max(2, Math.floor(widthBudgetDots / grid.pixx));
  } else {
    // bwip-js couldn't encode this payload (e.g. empty string) — fall back to
    // the prior estimate and auto-columns rather than blocking ZPL generation.
    columns = 0;
    rows = targetRows;
    moduleDots = Math.max(2, Math.floor(widthBudgetDots / 40));
  }

  const totalHeightDots = Math.max(rows, inchesToDots(opts.heightIn, opts.dpi));
  // Row height in dots (>=1); total height ≈ rowHeight × rows.
  const rowHeightDots = Math.max(1, Math.floor(totalHeightDots / rows));
  // ^B7<orientation>,rowHeight,security(0),dataColumns,rows,N(no human-readable)
  return `^BY${moduleDots}^FO${x},${y}^B7${o},${rowHeightDots},0,${columns},${rows},N^FD${data}^FS`;
}
