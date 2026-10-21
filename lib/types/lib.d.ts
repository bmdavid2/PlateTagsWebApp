export { TEMPLATES, getTemplate } from "./labels/templates";
export { resolveField, fitFontSize, estimateMaxChars, MIN_FONT_SIZE_IN } from "./labels/resolve";
export { buildLabelZpl, buildBatchZpl } from "./zpl/builder";
export { resolveQrPayload } from "./qr/content";
export { getCodeField, validateFormat, fitsField, allowedQrModes, validateManualValue, validateLabelQr, validateBatchRow, } from "./qr/validation";
export { MAX_LINES, emptyRow, rowToLabelData } from "./batch/table";
export type { BatchRow } from "./batch/table";
export type { FieldKind, FieldSpec, LabelData, LabelTemplate, LayoutOverride, QrMode, } from "./labels/types";
