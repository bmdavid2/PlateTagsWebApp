import type { BatchRow } from "../batch/table";
import type { FieldSpec, LabelData, LabelTemplate, QrMode } from "../labels/types";
/** The field on a template whose content this app's Code input controls. */
export declare function getCodeField(template: LabelTemplate): FieldSpec | undefined;
/** Does `value` match the shape `mode` implies? "field" mode is freeform. */
export declare function validateFormat(mode: QrMode, value: string): string | null;
/**
 * Does `data` physically fit `field`? qr fields always pass — no capacity
 * model exists for QR in this codebase, and existing template comments
 * confirm QR has ample headroom at these mag/error-level settings.
 */
export declare function fitsField(field: FieldSpec, data: string, dpi: number): boolean;
/**
 * Which qrModes are actually usable on this field, given its physical
 * capacity — closes the pre-existing gap where any mode could be picked on
 * any field even when it structurally can't fit (e.g. a full uuid on a
 * 4-row PDF417). Checked with a representative sample of each mode's shape.
 */
export declare function allowedQrModes(field: FieldSpec, dpi: number): QrMode[];
/**
 * Validate a manually-typed code value against `field`'s expected format and
 * physical capacity. A blank value is always valid — it means "auto-generate",
 * unchanged from today's behavior. "field" mode has nothing to override, so
 * a value is meaningless there (the UI doesn't show an input for it).
 */
export declare function validateManualValue(field: FieldSpec, value: string, dpi: number): string | null;
/** Validate a single label's `code` against its template's code field. */
export declare function validateLabelQr(data: LabelData, template: LabelTemplate): string | null;
/** Validate a batch row's `code` against its template's code field. */
export declare function validateBatchRow(row: BatchRow, template: LabelTemplate): string | null;
