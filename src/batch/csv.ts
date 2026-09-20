// CSV import/export for batch labels. Schema: count,PrintCode,Code,line_1..line_7.

import Papa from "papaparse";
import { emptyRow, MAX_LINES, type BatchRow } from "./table";

function parseBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y";
}

function parseCount(v: unknown): number {
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Parse CSV text into batch rows. Tolerant of missing line_* / Code columns.
 *
 * Legacy migration: older CSVs (e.g. the original data/plate_tags_template.csv)
 * use a `QR` column (TRUE/FALSE) instead of `PrintCode`, and have no `Code`
 * column at all. When `PrintCode` isn't present, `QR` is read instead —
 * `TRUE`/`FALSE` map straight across, and the absent `Code` column already
 * defaults to blank (auto-generate), so an old file behaves exactly as it did
 * before this feature existed.
 */
export function parseCsv(text: string): BatchRow[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return result.data.map((raw) => {
    const row = emptyRow();
    row.count = parseCount(raw.count ?? raw.Count);
    const hasPrintCode = raw.PrintCode !== undefined || raw.printcode !== undefined;
    row.printCode = hasPrintCode
      ? parseBool(raw.PrintCode ?? raw.printcode)
      : parseBool(raw.QR ?? raw.qr);
    const code = (raw.Code ?? raw.code ?? "").toString().trim();
    row.code = code || undefined;
    for (let i = 0; i < MAX_LINES; i++) {
      row.lines[i] = (raw[`line_${i + 1}`] ?? "").toString();
    }
    return row;
  });
}

/** Serialize batch rows back to the canonical CSV schema. */
export function toCsv(rows: BatchRow[]): string {
  const header = [
    "count",
    "PrintCode",
    "Code",
    ...Array.from({ length: MAX_LINES }, (_, i) => `line_${i + 1}`),
  ];
  const records = rows.map((r) => ({
    count: r.count,
    PrintCode: r.printCode ? "TRUE" : "FALSE",
    Code: r.code ?? "",
    ...Object.fromEntries(r.lines.map((l, i) => [`line_${i + 1}`, l])),
  }));
  return Papa.unparse({ fields: header, data: records });
}
