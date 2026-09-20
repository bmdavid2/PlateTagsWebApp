// Validation for pre-specified code values (LabelData.code / BatchRow.code).
//
// A manually-typed value has to (1) match the shape its field's `qrMode`
// implies, and (2) actually fit the physical field it's going into. Getting
// either wrong fails silently downstream — src/zpl/elements.ts has no length
// cap and will happily emit out-of-budget ZPL — so this module is the single
// gate that blocks printing/export on bad input instead.

import type { BatchRow } from "../batch/table";
import type { FieldSpec, LabelData, LabelTemplate, QrMode } from "../labels/types";
import { pdf417Grid } from "../zpl/elements";
import { inchesToDots } from "../zpl/units";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHORT_ID_REGEX = /^[0-9a-f]{7}$/i;

/** The field on a template whose content this app's Code input controls. */
export function getCodeField(template: LabelTemplate): FieldSpec | undefined {
  return template.fields.find(
    (f) => (f.kind === "qr" || f.kind === "barcode" || f.kind === "pdf417") && !f.mirrorPayloadOf,
  );
}

/** Does `value` match the shape `mode` implies? "field" mode is freeform. */
export function validateFormat(mode: QrMode, value: string): string | null {
  if (mode === "uuid") {
    return UUID_REGEX.test(value) ? null : "Not a valid UUID (expected e.g. 8f14e45f-…-…-…-…, 36 chars)";
  }
  if (mode === "shortId") {
    return SHORT_ID_REGEX.test(value) ? null : "Expected 7 hex characters (0-9, a-f)";
  }
  return null;
}

/**
 * Real Code128 capacity check — a hard version of the best-effort clamp
 * `barcodeElement` (src/zpl/elements.ts) uses when generating ZPL, applied
 * here as pass/fail instead of a silent clamp.
 */
function barcodeFitsWidth(data: string, widthIn: number, dpi: number): boolean {
  const modules = 11 * data.length + 35;
  const totalDots = inchesToDots(widthIn, dpi);
  return Math.floor(totalDots / modules) >= 2;
}

/**
 * Does `data` physically fit `field`? qr fields always pass — no capacity
 * model exists for QR in this codebase, and existing template comments
 * confirm QR has ample headroom at these mag/error-level settings.
 */
export function fitsField(field: FieldSpec, data: string, dpi: number): boolean {
  if (field.kind === "pdf417") {
    const targetRows = field.pdf417Rows ?? 3;
    const grid = pdf417Grid(data, targetRows);
    return !!grid && grid.rows <= targetRows;
  }
  if (field.kind === "barcode") {
    return barcodeFitsWidth(data, field.barcodeWidthIn ?? 1, dpi);
  }
  return true;
}

/**
 * Which qrModes are actually usable on this field, given its physical
 * capacity — closes the pre-existing gap where any mode could be picked on
 * any field even when it structurally can't fit (e.g. a full uuid on a
 * 4-row PDF417). Checked with a representative sample of each mode's shape.
 */
export function allowedQrModes(field: FieldSpec, dpi: number): QrMode[] {
  const modes: QrMode[] = ["field"];
  const uuidSample = "00000000-0000-0000-0000-000000000000";
  const shortIdSample = "0000000";
  if (fitsField(field, uuidSample, dpi)) modes.push("uuid");
  if (fitsField(field, shortIdSample, dpi)) modes.push("shortId");
  return modes;
}

/**
 * Validate a manually-typed code value against `field`'s expected format and
 * physical capacity. A blank value is always valid — it means "auto-generate",
 * unchanged from today's behavior. "field" mode has nothing to override, so
 * a value is meaningless there (the UI doesn't show an input for it).
 */
export function validateManualValue(field: FieldSpec, value: string, dpi: number): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const mode = field.qrMode ?? "uuid";
  if (mode === "field") return null;
  const formatError = validateFormat(mode, trimmed);
  if (formatError) return formatError;
  return fitsField(field, trimmed, dpi) ? null : "Doesn't fit this label's code field";
}

/** Validate a single label's `code` against its template's code field. */
export function validateLabelQr(data: LabelData, template: LabelTemplate): string | null {
  const field = getCodeField(template);
  if (!field) return null;
  return validateManualValue(field, data.code ?? "", template.dpi);
}

/** Validate a batch row's `code` against its template's code field. */
export function validateBatchRow(row: BatchRow, template: LabelTemplate): string | null {
  const field = getCodeField(template);
  if (!field) return null;
  return validateManualValue(field, row.code ?? "", template.dpi);
}
