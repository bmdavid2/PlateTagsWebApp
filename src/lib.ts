// Public entry point of the framework-free label core, bundled by
// `npm run build:lib` (vite.lib.config.ts) into lib/platetags-core.js for
// consumers outside this app (e.g. a plain-ES-module page with no build step).
// The React app does not import this file; it only re-exports existing modules.

export { TEMPLATES, getTemplate } from "./labels/templates";
export { fieldText, resolveField, fitFontSize, estimateMaxChars, MIN_FONT_SIZE_IN } from "./labels/resolve";
export { buildLabelZpl, buildBatchZpl } from "./zpl/builder";
export { resolveQrPayload } from "./qr/content";
export {
  getCodeField,
  validateFormat,
  fitsField,
  allowedQrModes,
  validateManualValue,
  validateLabelQr,
  validateBatchRow,
} from "./qr/validation";
export { checkLabel } from "./labels/check";
export type { LabelIssue } from "./labels/check";
export { MAX_LINES, emptyRow, rowToLabelData } from "./batch/table";
export type { BatchRow } from "./batch/table";
export type {
  FieldKind,
  FieldSpec,
  LabelData,
  LabelTemplate,
  LayoutOverride,
  QrMode,
} from "./labels/types";
