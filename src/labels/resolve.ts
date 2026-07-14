// Shared field resolution: applies the no-code layout, the user's manual layout
// override, and auto-fit sizing to a template field, in that order. Both ZPL
// generation (zpl/builder.ts) and the on-screen preview (ui/LabelPreview.tsx)
// use this so print and preview can never diverge.

import type { FieldSpec, LabelData } from "./types";

/** Empirical average glyph width for ZPL font "0", as a fraction of its point size. */
export const AVG_CHAR_WIDTH_RATIO = 0.6;

/** Smallest font size (inches) auto-fit will shrink to before falling back to truncation. */
export const MIN_FONT_SIZE_IN = 0.06;

/**
 * The largest size in [MIN_FONT_SIZE_IN, defaultSizeIn] that fits all of `text`
 * within `maxWidthIn`. Returns `defaultSizeIn` unchanged when there's no width
 * budget, no text, or the text already fits at the default size.
 */
export function fitFontSize(text: string, defaultSizeIn: number, maxWidthIn?: number): number {
  if (!maxWidthIn || text.length === 0) return defaultSizeIn;
  const neededWidth = text.length * AVG_CHAR_WIDTH_RATIO * defaultSizeIn;
  if (neededWidth <= maxWidthIn) return defaultSizeIn;
  const fitSize = maxWidthIn / (AVG_CHAR_WIDTH_RATIO * text.length);
  return Math.max(MIN_FONT_SIZE_IN, Math.min(defaultSizeIn, fitSize));
}

/** How many characters fit in `maxWidthIn` at `sizeIn`. */
export function estimateMaxChars(maxWidthIn: number | undefined, sizeIn: number): number | undefined {
  if (maxWidthIn == null || sizeIn <= 0) return undefined;
  return Math.max(1, Math.floor(maxWidthIn / (AVG_CHAR_WIDTH_RATIO * sizeIn)));
}

/**
 * Resolve a field's final layout for rendering/printing:
 *  1. Apply `base.noCodeLayout` when the code toggle (`data.qr`) is off (text fields only).
 *  2. Apply the user's manual LayoutOverride (x/y/size/font) on top. If it sets `size`,
 *     that size is final and step 3 is skipped.
 *  3. Otherwise, auto-fit: shrink `size` to fit the field's current text within
 *     `maxWidthIn`, down to MIN_FONT_SIZE_IN.
 *  4. Compute `maxChars` from the final size and `maxWidthIn` — `truncate()` (zpl/elements.ts)
 *     only trims anything if the text still overflows at MIN_FONT_SIZE_IN.
 */
export function resolveField(base: FieldSpec, data: LabelData): FieldSpec {
  let field: FieldSpec = base;

  if (!data.qr && base.kind === "text" && base.noCodeLayout) {
    field = { ...field, ...base.noCodeLayout };
  }

  const override = data.overrides[base.id];
  const sizeOverridden = override?.size != null;
  if (override) {
    field = {
      ...field,
      x: override.x ?? field.x,
      y: override.y ?? field.y,
      size: override.size ?? field.size,
      font: override.font ?? field.font,
    };
  }

  if (field.kind === "text" && field.maxWidthIn != null) {
    if (!sizeOverridden) {
      const text = data.values[base.sourceField ?? base.id] ?? "";
      field = { ...field, size: fitFontSize(text, field.size, field.maxWidthIn) };
    }
    field = { ...field, maxChars: estimateMaxChars(field.maxWidthIn, field.size) };
  }

  return field;
}
