// Core domain types for the label designer.
//
// A LabelTemplate is the immutable config for one labtag.com product: its
// physical size, the printer resolution it is printed at, and the default set
// of fields laid out on it. The UI produces LabelData (the user's field values)
// plus optional LayoutOverrides (per-field nudges to position/size/font) which
// are combined with the template at ZPL-build time.

export type FieldKind = "text" | "qr" | "barcode" | "pdf417";

/**
 * How an encoded field (QR or barcode) derives its payload.
 * - "uuid": a fresh uuid4 per label.
 * - "field": the value of a configured source field.
 * - "shortId": a fresh 7-hex-character code per label (first 7 chars of a
 *   uuid4, hyphens stripped) — for encoded fields too width-constrained to
 *   fit a full uuid (e.g. a 4-row PDF417 on a short label), while keeping
 *   collision risk negligible for realistic batch sizes. See resolveQrPayload
 *   in src/qr/content.ts for why 7 chars / 4 rows specifically.
 */
export type QrMode = "uuid" | "field" | "shortId";

/** A ZPL-supported font. `0` is the scalable default; A–H are bitmap fonts. */
export type ZplFont = "0" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

/**
 * A single element placed on the label. Coordinates and sizes are in inches;
 * they are converted to dots at build time using the template's dpi. This keeps
 * the config resolution-independent (203 vs 300 dpi is a template switch).
 */
export interface FieldSpec {
  /** Stable id. Text fields use `line_1`..`line_n` to match the CSV schema. */
  id: string;
  kind: FieldKind;
  /** Human label shown in the form (text fields only). */
  label?: string;
  /** Position of the field's top-left origin, in inches from label top-left. */
  x: number;
  y: number;
  /**
   * Height in inches. For text/date this is the font height. For qr it is the
   * module magnification hint. For barcode/pdf417 it is the code height in inches.
   */
  size: number;
  font?: ZplFont;
  /**
   * Authored width budget in inches for a text field (the space it may grow
   * into before truncating). This is the source of truth for sizing; `size`
   * acts as a ceiling. At render/build time `resolveField` (src/labels/resolve.ts)
   * shrinks the effective font size to fit the current text within this width
   * (down to MIN_FONT_SIZE_IN) before falling back to truncation.
   */
  maxWidthIn?: number;
  /** Resolved character limit at the field's final (possibly auto-fit) size. Computed by `resolveField`, not authored in templates.ts. */
  maxChars?: number;
  /**
   * Alternate position/width applied to a text field when the template's code
   * field (qr/barcode/pdf417) is toggled off, so text can reclaim the space
   * the code would have occupied. Applied by `resolveField` before the user's
   * manual LayoutOverride and before auto-fit sizing.
   */
  noCodeLayout?: { x?: number; maxWidthIn?: number };
  /**
   * Horizontal alignment for text fields. "left" (default) places the text
   * at `x`. "center" centers it within a block of `blockWidthIn` inches whose
   * left edge is `x` (so the field is centered on `x + blockWidthIn/2`).
   */
  align?: "left" | "center";
  /** Block width in inches for centered text (required when align is "center"). */
  blockWidthIn?: number;
  /**
   * For text fields: mirror another field's value instead of taking its own
   * input. Used e.g. by the circle cap-label to echo `line_1`. Such a field is
   * not shown as a separate input in the form.
   */
  sourceField?: string;
  /** For qr/barcode/pdf417 fields: where the payload comes from. */
  qrMode?: QrMode;
  /** For qr/barcode/pdf417 with qrMode "field": which field id supplies the payload. */
  qrSourceField?: string;
  /**
   * For qr/barcode/pdf417 fields: reuse the *identical* resolved payload of
   * another encoded field (by id) instead of resolving an independent one. Used
   * so a QR and a PDF417 copy encode the same per-label uuid. When set, this
   * field's own qrMode/qrSourceField are ignored.
   */
  mirrorPayloadOf?: string;
  /** For barcode/pdf417 fields: total code width in inches. */
  barcodeWidthIn?: number;
  /** For barcode fields: print the human-readable value below the bars (default false). */
  barcodeShowText?: boolean;
  /**
   * For pdf417 fields: number of data rows (3–90). Fewer rows = shorter/wider.
   * On a very short label, 3 is the practical minimum. Defaults to 3.
   */
  pdf417Rows?: number;
  /**
   * For qr fields: additional origins to also render the same code at (mirror).
   * CryoTag prints the QR at both ends of the label.
   */
  mirrorOrigins?: { x: number; y: number }[];
}

/**
 * A visual guide drawn in the preview to show a die-cut region (e.g. the
 * rectangle body + circle cap of a compound "set" label). Purely cosmetic —
 * has no effect on ZPL; fields position by absolute inches across the media.
 */
export interface LabelRegion {
  shape: "rect" | "circle";
  /** Top-left origin in inches (for circle, the bounding-box top-left). */
  x: number;
  y: number;
  /** Width in inches. For a circle this is the diameter (height ignored). */
  w: number;
  h: number;
  label?: string;
}

/** Immutable product configuration. */
export interface LabelTemplate {
  id: string;
  /** Display name in the picker. */
  name: string;
  /** labtag.com product number, for reference. */
  productNumber?: string;
  /**
   * Overall media dimensions in inches — the full printable area the ZD621
   * advances per label (gap-to-gap length). All field coordinates are relative
   * to this area's top-left.
   */
  widthIn: number;
  heightIn: number;
  /** Print resolution in dots per inch (203 or 300 for ZD621). */
  dpi: 203 | 300;
  /**
   * Rotate the whole label this many degrees clockwise when printing/previewing.
   * Use when the physical media feeds in a different orientation than the design
   * is authored in (e.g. a 1.5″×0.75″ landscape design on portrait-feeding
   * media → rotate: 90). Fields are still authored in the unrotated design space
   * (widthIn × heightIn); the builder swaps ^PW/^LL and transforms coordinates.
   * 90 = clockwise (ZPL orientation R); 180 = inverted (orientation I);
   * 270 = counter-clockwise (orientation B). Defaults to 0 (no rotation).
   */
  rotate?: 0 | 90 | 180 | 270;
  /** Optional die-cut region guides drawn in the preview. */
  regions?: LabelRegion[];
  /** Default state of the QR toggle for a new label (defaults to true). */
  qrDefault?: boolean;
  /** Default fields laid out on the label. */
  fields: FieldSpec[];
}

/** A per-field layout tweak applied on top of the template default. */
export interface LayoutOverride {
  x?: number;
  y?: number;
  size?: number;
  font?: ZplFont;
}

/**
 * A resolved label to print: the chosen template id, the user's values keyed by
 * field id, per-field layout overrides, feature toggles, and copy count.
 */
export interface LabelData {
  templateId: string;
  /** Field id -> text value (for text fields). */
  values: Record<string, string>;
  /** Field id -> layout override. */
  overrides: Record<string, LayoutOverride>;
  /** Whether the QR field is rendered. */
  qr: boolean;
  /** Override the template's QR mode (uuid vs a field value). */
  qrMode?: QrMode;
  /** When qrMode is "field", the field id whose value the QR encodes. */
  qrSourceField?: string;
  /** Number of copies. */
  count: number;
}
