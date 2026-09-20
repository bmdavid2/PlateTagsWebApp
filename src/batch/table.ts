// Batch row model. A BatchRow mirrors the CSV schema
// (count, PrintCode, Code, line_1..line_7) plus the target template. Rows
// convert to LabelData for ZPL building.

import { getTemplate } from "../labels/templates";
import type { LabelData } from "../labels/types";

export const MAX_LINES = 7;

export interface BatchRow {
  count: number;
  printCode: boolean;
  /** Pre-specified code value; blank/absent means auto-generate. */
  code?: string;
  /** line_1..line_7 values, indexed 0..6. */
  lines: string[];
}

export function emptyRow(): BatchRow {
  return { count: 1, printCode: true, lines: Array(MAX_LINES).fill("") };
}

/** Convert a batch row to LabelData for the given template. */
export function rowToLabelData(templateId: string, row: BatchRow): LabelData {
  const template = getTemplate(templateId);
  const values: Record<string, string> = {};
  // Map lines onto the template's text fields (line_1, line_2, ...).
  const textFields = template.fields.filter((f) => f.kind === "text");
  textFields.forEach((f, i) => {
    values[f.id] = row.lines[i] ?? "";
  });
  return {
    templateId,
    values,
    overrides: {},
    printCode: row.printCode,
    code: row.code,
    count: Math.max(1, Math.floor(row.count || 1)),
  };
}
