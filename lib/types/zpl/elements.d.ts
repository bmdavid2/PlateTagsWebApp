import type { ZplFont } from "../labels/types";
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
export declare function sanitizeFieldData(text: string): string;
/**
 * Truncate to maxChars, marking an over-length value with a single trailing "+"
 * (the "+" occupies the last allotted character, so the result never exceeds
 * maxChars).
 */
export declare function truncate(text: string, maxChars?: number): string;
/**
 * A scalable-font text field: ^FO x,y ^A0N,h,w ^FD text ^FS
 *
 * When `align` is "center", the text is centered within a `blockWidthIn`-wide
 * block starting at `x`, using ZPL's ^FB (field block) with centered
 * justification: ^FB<width>,1,0,C. Left alignment (default) omits ^FB.
 */
export declare function textElement(opts: {
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
}): string;
/**
 * A native ZPL QR code: ^FO x,y ^BQN,2,<mag> ^FD <error>A,<data> ^FS
 * `mag` is the module magnification (integer). `errorLevel` defaults to M.
 */
export declare function qrElement(opts: {
    xIn: number;
    yIn: number;
    magnification: number;
    data: string;
    dpi: number;
    errorLevel?: "L" | "M" | "Q" | "H";
    orientation?: ZplOrientation;
}): string;
/**
 * A native ZPL Code128 barcode: ^BY sets the module (narrow-bar) width, then
 * ^FO x,y ^BCN,<height>,<showText>,N,N ^FD <data> ^FS.
 *
 * Code128 width scales with data length: total width ≈ modules × moduleDots,
 * where modules ≈ 11 × (chars + overhead). We derive the module width in dots
 * from the requested total width so the barcode fits its allotted space, and
 * clamp it to the printer's minimum of 2 dots.
 */
export declare function barcodeElement(opts: {
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
}): string;
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
 *
 * Exported so src/qr/validation.ts can reuse this same real-encode probe to
 * check ahead of time whether a manually-typed code value fits a pdf417
 * field's row budget, instead of only discovering an overflow at print time.
 */
export declare function pdf417Grid(data: string, targetRows: number): {
    columns: number;
    rows: number;
    pixx: number;
} | null;
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
export declare function pdf417Element(opts: {
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
}): string;
