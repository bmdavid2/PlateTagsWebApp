import type { LabelTemplate } from "./types";

// ---------------------------------------------------------------------------
// Label product config table — the single source of truth for label geometry.
//
// All three templates are real labtag.com thermal-transfer products printed on
// a Zebra ZD621. Coordinates/sizes are in inches; units.ts converts to dots
// (inches * dpi). Everything downstream (ZPL, preview) reads from here, so
// this table is the only place to change label layout.
//
// Text fields use `maxWidthIn` (the physical width budget) rather than a
// static character count: `size` is a ceiling, and `resolveField`
// (src/labels/resolve.ts) shrinks the effective font size at render/build
// time to fit whatever the user typed within `maxWidthIn`, down to
// MIN_FONT_SIZE_IN, before truncating. A `noCodeLayout` on a text field gives
// it a wider `maxWidthIn` (and usually a smaller `x`) to use when the
// template's code field is toggled off.
// ---------------------------------------------------------------------------

/**
 * Cryotube tag — labtag FJT-10C1-1WH: Permanent Deep-Freeze labels for
 * thermal-transfer printers. 1.5″×0.75″ (305×152 dots @203 dpi). A single QR
 * sits at the left; 5 text lines run in the column to its right.
 *
 * The design is authored landscape (1.5″ wide × 0.75″ tall). `rotate: 180`
 * orients it to print upright on this media. Field coordinates below are in
 * this normal (unrotated) design space — for `rotate: 180`, `builder.ts`
 * emits `^POI` to invert the whole composed label rather than reflecting each
 * field's coordinates, since ZPL's `^FO` always anchors pre-rotation. This is
 * a 203-dpi ZD621: printing at the wrong dpi scales the whole label (300-dpi
 * dots on a 203-dpi head print ~1.48× too large), so dpi must match the
 * hardware. Adjust rotate (0/180; 90/270 unverified) or dpi (203/300) if the
 * media/printer changes.
 */
const cryotube: LabelTemplate = {
  id: "cryotube",
  name: "Cryotube — Deep-Freeze (FJT-10)",
  productNumber: "FJT-10C1-1WH",
  widthIn: 1.5,
  heightIn: 0.75,
  dpi: 203,
  rotate: 180,
  // Layout uses a ~0.08″ safe margin on every edge: the ZD621's unprintable
  // border + label registration drift clip anything closer. Printable area:
  // x∈[0.08,1.42], y∈[0.08,0.67]. QR (mag 3, uuid ≈29 modules) ≈0.43″ square,
  // top-left. 5 text lines fill the full printable height at a 0.12″ pitch
  // (0.09″ font + margin); text column right of the QR (x 0.57→1.42, 0.85″
  // wide) — when the QR is off, `noCodeLayout` widens it to the full row
  // (x 0.08→1.42, 1.34″ wide).
  fields: [
    { id: "line_1", kind: "text", label: "Line 1", x: 0.57, y: 0.08, size: 0.09, font: "0", maxWidthIn: 0.85, noCodeLayout: { x: 0.08, maxWidthIn: 1.34 } },
    { id: "line_2", kind: "text", label: "Line 2", x: 0.57, y: 0.20, size: 0.09, font: "0", maxWidthIn: 0.85, noCodeLayout: { x: 0.08, maxWidthIn: 1.34 } },
    { id: "line_3", kind: "text", label: "Line 3", x: 0.57, y: 0.32, size: 0.09, font: "0", maxWidthIn: 0.85, noCodeLayout: { x: 0.08, maxWidthIn: 1.34 } },
    { id: "line_4", kind: "text", label: "Line 4", x: 0.57, y: 0.44, size: 0.09, font: "0", maxWidthIn: 0.85, noCodeLayout: { x: 0.08, maxWidthIn: 1.34 } },
    { id: "line_5", kind: "text", label: "Line 5", x: 0.57, y: 0.56, size: 0.09, font: "0", maxWidthIn: 0.85, noCodeLayout: { x: 0.08, maxWidthIn: 1.34 } },
    {
      id: "qr",
      kind: "qr",
      x: 0.08,
      y: 0.08,
      size: 3,
      qrMode: "uuid",
    },
  ],
};

/**
 * Microplate tag — labtag AMA-227NP: PlateTAG removable Deep-Freeze labels for
 * microplates. 2″×0.25″, thermal transfer, applied along a plate skirt/edge.
 * This is the same 203-dpi ZD621 confirmed via the cryotube (2″×0.25″ =
 * 406×51 dots @203 dpi). This template originally shipped at a placeholder
 * `dpi: 300`, never physically verified — a test print showed the barcode
 * clipped and measuring visibly wider than computed, the same ~1.48×
 * oversized-print signature as the original cryotube dpi bug (300-dpi dots
 * on a 203-dpi head), and 3 PDF417 rows at the old 300-dpi row height would
 * have needed ~0.28″ — more than this label's entire 0.25″ height. Confirmed
 * with the user this is the same physical printer as the cryotube.
 *
 * A QR is too small to scan reliably on this 0.25″-tall strip, so this label
 * uses a 2D **PDF417** stacked barcode instead, at **4 rows** (not the
 * PDF417 minimum of 3): a full uuid4 can't fit at any row count on a label
 * this narrow, so the code defaults to `qrMode: "shortId"` — see
 * `resolveQrPayload` in `src/qr/content.ts`. 3 rows was tried first and
 * rejected: PDF417's per-row minimum codeword count means *any* payload at
 * only 3 rows hits a structural width floor around 1.5-1.7″ regardless of
 * how short it is, leaving no reliable room for the plate-ID text. 4 rows
 * with a 7-char shortId is a *deterministic* 1.35″ (10,000-sample bwip-js
 * sweep, zero variance) — worth the extra row given the height budget has
 * room for it at the correct dpi.
 *
 * Horizontal margins are 0.08″ on both edges, matching the cryotube. Layout:
 * code on the left (x 0.08→1.43, 1.35″ deterministic width), the
 * human-readable plate ID on the right (x 1.49→1.92, 0.43″ wide) — when the
 * barcode is off, `noCodeLayout` widens it to the full strip (x 0.08→1.92,
 * 1.84″ wide).
 */
const microplate: LabelTemplate = {
  id: "microplate",
  name: "Microplate — PlateTAG (AMA-227NP)",
  productNumber: "AMA-227NP",
  widthIn: 2.0,
  heightIn: 0.25,
  dpi: 203,
  fields: [
    // PDF417 stacked barcode on the left, encoding a fresh short id per label.
    {
      id: "barcode",
      kind: "pdf417",
      x: 0.08,
      y: 0.03,
      size: 0.19, // total code height in inches
      barcodeWidthIn: 1.36, // deterministic 1.35" for a 7-char shortId at 4 rows, + tiny buffer
      pdf417Rows: 4,
      qrMode: "shortId",
    },
    // Human-readable plate ID on the right (also what the barcode encodes).
    {
      id: "line_1",
      kind: "text",
      label: "Plate ID",
      x: 1.49,
      y: 0.05,
      size: 0.12,
      font: "0",
      maxWidthIn: 0.43,
      noCodeLayout: { x: 0.08, maxWidthIn: 1.84 },
    },
  ],
};

/**
 * Bottle/tube tag — labtag FJT-556C1-1WH: Deep-Freeze labels for 50 mL conical
 * tubes. A compound "set": a 2″×1″ rectangle (tube body) + a 1″ circle (cap
 * top), printed as ONE combined label. Thermal transfer, on the same 203-dpi
 * ZD621 as the cryotube and microplate (this template also originally shipped
 * at an unverified placeholder `dpi: 300` — see the microplate template's
 * comment for the physical test print that caught this class of bug — fixed
 * here preemptively even though bottle hasn't been physically tested yet).
 *
 * Media modeled as a 3″×1″ area: rectangle spans x 0–2, circle spans x 2–3
 * (1″ diameter within the 1″ height). The circle carries the QR (centered) plus
 * a short cap ID (centered) echoing line_1. The rectangle carries 4 text lines
 * and a PDF417 at the bottom that encodes the *same* payload as the circle's
 * QR (via mirrorPayloadOf), so the tube body is scannable without reading the
 * cap. The circle's QR defaults to `qrMode: "shortId"` rather than a full
 * uuid4, and `body_code` runs at **4 PDF417 rows** (not the minimum 3) —
 * same reasoning as the microplate template: at only 3 rows, PDF417's
 * per-row minimum codeword count creates a structural width floor around
 * 1.5-1.7″ regardless of payload length, too wide for a comfortable budget
 * here; 4 rows with a 7-char shortId is a deterministic 1.35″ (see
 * `resolveQrPayload` in `src/qr/content.ts`). A QR alone would handle a full
 * uuid4 fine, but since it mirrors into the narrow PDF417 strip, both use
 * the shorter code. The text lines already span the full usable rectangle
 * width regardless of the code toggle (the PDF417 sits in its own strip
 * below the last line, not beside them), so there's no `noCodeLayout` here —
 * nothing to reclaim.
 *
 * This template originally had 5 text lines with `body_code` at y=0.8/height
 * 0.18 — that left only ~0.02″ of bottom margin (well under the 0.08″ safe
 * margin used elsewhere), never physically tested. Dropped to 4 lines to free
 * the room: `body_code` now starts at y=0.71 (an 0.08″ gap after line_4) with
 * a taller 0.20″ height budget, landing ~0.09″ above the bottom edge.
 * `cap_id`'s `maxWidthIn` was also corrected from the full 1″ circle diameter
 * to ~0.55″ — at y=0.12 (near the circle's top, far from its y=0.5 center),
 * the true chord width is only ~0.65″, not the full diameter; the old value
 * could let text overflow the die-cut edge. `blockWidthIn` stays at the full
 * 1.0″ diameter since it drives centering on the circle's true center, not
 * the character-limit budget.
 */
const bottle: LabelTemplate = {
  id: "bottle",
  name: "Bottle/Tube — 50 mL conical (FJT-556)",
  productNumber: "FJT-556C1-1WH",
  widthIn: 3.0,
  heightIn: 1.0,
  dpi: 203,
  regions: [
    { shape: "rect", x: 0, y: 0, w: 2, h: 1, label: "body 2″×1″" },
    { shape: "circle", x: 2, y: 0, w: 1, h: 1, label: "cap 1″⌀" },
  ],
  fields: [
    // --- rectangle body (x 0–2) ---
    // maxWidthIn keeps text inside the 2″ rectangle: at font 0 (~0.6× the
    // point size per char) the printable run from x:0.12 to the die-cut edge
    // is ~1.88″, so 1.76″ leaves a safety margin. 5 lines run y=0.06→0.76,
    // clearing the PDF417's top edge (y=0.8) with room to spare.
    { id: "line_1", kind: "text", label: "Line 1", x: 0.12, y: 0.06, size: 0.15, font: "0", maxWidthIn: 1.76 },
    { id: "line_2", kind: "text", label: "Line 2", x: 0.12, y: 0.24, size: 0.12, font: "0", maxWidthIn: 1.76 },
    { id: "line_3", kind: "text", label: "Line 3", x: 0.12, y: 0.39, size: 0.12, font: "0", maxWidthIn: 1.76 },
    { id: "line_4", kind: "text", label: "Line 4", x: 0.12, y: 0.53, size: 0.10, font: "0", maxWidthIn: 1.76 },
    // PDF417 at the bottom, encoding the SAME payload as the circle's QR.
    // x aligned with the text's left margin; deterministic 1.35" width (7-char
    // shortId at 4 rows) ends at 1.47", well inside the ~1.88" die-cut run.
    // y=0.71 gives an 0.08" gap after line_4 (ends 0.63); the 0.20" height
    // budget lands the code's bottom edge at ~0.907", a 0.093" safe margin.
    {
      id: "body_code",
      kind: "pdf417",
      x: 0.12,
      y: 0.71,
      size: 0.20, // total code height in inches — enlarged for reliable scanning
      barcodeWidthIn: 1.4,
      pdf417Rows: 4,
      mirrorPayloadOf: "qr",
    },
    // --- circle cap (x 2–3) ---
    // Short ID echoing line_1, centered horizontally across the circle, near top.
    {
      id: "cap_id",
      kind: "text",
      label: "Cap ID",
      x: 2.0,
      y: 0.12,
      size: 0.1,
      font: "0",
      // Real chord width at y=0.12 (0.38" from the circle's y=0.5 center) is
      // ~0.65" — not the full 1" diameter. 0.55" leaves ~0.1" margin.
      maxWidthIn: 0.55,
      sourceField: "line_1",
      align: "center",
      blockWidthIn: 1.0, // full diameter — drives centering, not the char limit
    },
    // QR centered in the ~1″ circle. mag 4 leaves comfortable margin inside
    // the circle for a short shortId payload (a full uuid would run larger
    // but still fit — QR handles length far more gracefully than a 3-row
    // PDF417 does) and room for the cap ID above. x centers the code
    // approximately on the circle's center (2.5″).
    {
      id: "qr",
      kind: "qr",
      x: 2.31,
      y: 0.32,
      size: 4,
      qrMode: "shortId",
    },
  ],
};

export const TEMPLATES: LabelTemplate[] = [cryotube, microplate, bottle];

export function getTemplate(id: string): LabelTemplate {
  const t = TEMPLATES.find((t) => t.id === id);
  if (!t) throw new Error(`Unknown label template: ${id}`);
  return t;
}
