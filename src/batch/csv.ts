// CSV import/export for batch labels. Uses the existing schema from
// data/plate_tags_template.csv: count,QR,line_1..line_7.

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

/** Parse CSV text into batch rows. Tolerant of missing line_* columns. */
export function parseCsv(text: string): BatchRow[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return result.data.map((raw) => {
    const row = emptyRow();
    row.count = parseCount(raw.count ?? raw.Count);
    row.qr = parseBool(raw.QR ?? raw.qr);
    for (let i = 0; i < MAX_LINES; i++) {
      row.lines[i] = (raw[`line_${i + 1}`] ?? "").toString();
    }
    return row;
  });
}

/** Serialize batch rows back to the canonical CSV schema. */
export function toCsv(rows: BatchRow[]): string {
  const header = ["count", "QR", ...Array.from({ length: MAX_LINES }, (_, i) => `line_${i + 1}`)];
  const records = rows.map((r) => ({
    count: r.count,
    QR: r.qr ? "TRUE" : "FALSE",
    ...Object.fromEntries(r.lines.map((l, i) => [`line_${i + 1}`, l])),
  }));
  return Papa.unparse({ fields: header, data: records });
}
