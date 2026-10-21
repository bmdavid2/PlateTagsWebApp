// Pre-print checks for a label: will the code physically fit and scan, and will
// any text be truncated? Nothing here changes what is printed; callers decide
// whether to block on "error" issues. Used with `LabelData.freeCode`, where the
// code is an arbitrary caller-supplied string rather than a generated one.

import bwipjs from "bwip-js/browser";
import { pdf417Grid } from "../zpl/elements";
import { resolveField, fieldText } from "./resolve";
import { getTemplate } from "./templates";
import type { FieldSpec, LabelData, LabelTemplate } from "./types";

export interface LabelIssue {
  level: "error" | "warn";
  /** Field id the issue concerns. */
  field: string;
  message: string;
}

/** Safe margin from the die-cut edge, matching the templates' authoring margin. */
const EDGE_MARGIN_IN = 0.08;
/** Gap kept between a code and the next field to its right. */
const GAP_IN = 0.02;
const EPS = 0.005;

function codeExtent(f: FieldSpec, code: string, dpi: number): { w: number; h: number } | { error: string } {
  if (f.kind === "qr") {
    try {
      const raw = bwipjs.raw({ bcid: "qrcode", text: code, eclevel: "M" } as Parameters<typeof bwipjs.raw>[0])[0] as { pixx: number };
      const s = (raw.pixx * Math.max(1, Math.round(f.size))) / dpi;
      return { w: s, h: s };
    } catch {
      return { error: "cannot be encoded as a QR code" };
    }
  }
  if (f.kind === "pdf417") {
    const rows = f.pdf417Rows ?? 3;
    const grid = pdf417Grid(code, rows);
    if (!grid) return { error: "cannot be encoded as PDF417" };
    if (grid.rows > rows) return { error: `needs ${grid.rows} PDF417 rows but the label has ${rows}` };
    const budget = Math.floor((f.barcodeWidthIn ?? 1) * dpi);
    const moduleDots = Math.max(2, Math.floor(budget / grid.pixx));
    return { w: (grid.pixx * moduleDots) / dpi, h: f.size };
  }
  // Code128: 11 modules per char + overhead, at least 2 dots per module.
  const w = ((11 * code.length + 35) * 2) / dpi;
  return { w, h: f.size };
}

function textHeight(g: FieldSpec): number {
  return g.kind === "qr" ? 0.5 : g.size;
}

/** Right-hand limit (inches, design space) for a code starting at `f.x`. */
function rightLimit(t: LabelTemplate, f: FieldSpec, h: number): number {
  let limit = t.widthIn - EDGE_MARGIN_IN;
  const rect = t.regions?.find((r) => r.shape === "rect" && f.x >= r.x && f.x < r.x + r.w && f.y >= r.y && f.y < r.y + r.h);
  if (rect) limit = Math.min(limit, rect.x + rect.w - EDGE_MARGIN_IN);
  for (const g of t.fields) {
    if (g === f || g.id === f.mirrorPayloadOf || g.mirrorPayloadOf === f.id || g.x <= f.x) continue;
    if (g.y < f.y + h && f.y < g.y + textHeight(g)) limit = Math.min(limit, g.x - GAP_IN);
  }
  return limit;
}

export function checkLabel(data: LabelData): LabelIssue[] {
  const t = getTemplate(data.templateId);
  const issues: LabelIssue[] = [];

  // --- text truncation / sanitising ---
  for (const f of t.fields) {
    if (f.kind !== "text") continue;
    const text = fieldText(f, data);
    if (!text.trim()) continue;
    const r = resolveField(f, data);
    if (r.maxChars != null && text.length > r.maxChars) {
      issues.push({ level: "warn", field: f.id, message: `"${text}" is ${text.length} characters; at most ${r.maxChars} fit (it will be cut with "+")` });
    }
    if (/[\^~]/.test(text)) issues.push({ level: "warn", field: f.id, message: "contains ^ or ~, which print as spaces" });
  }

  // --- code ---
  const code = data.code?.trim();
  if (!data.printCode || !code || !data.freeCode) return issues;
  if (!/^[\x20-\x7e]+$/.test(code)) {
    issues.push({ level: "error", field: "code", message: "contains characters outside printable ASCII" });
    return issues;
  }
  if (/[\^~]/.test(code)) issues.push({ level: "error", field: "code", message: "contains ^ or ~, which cannot be printed" });

  for (const f of t.fields) {
    if (f.kind === "text") continue;
    const ext = codeExtent(f, code, t.dpi);
    if ("error" in ext) {
      issues.push({ level: "error", field: f.id, message: `code ${ext.error}` });
      continue;
    }
    const origins = [{ x: f.x, y: f.y }, ...(f.mirrorOrigins ?? [])];
    for (const o of origins) {
      const at: FieldSpec = { ...f, x: o.x, y: o.y };
      const circle = t.regions?.find(
        (r) => r.shape === "circle" && o.x >= r.x && o.x < r.x + r.w && o.y >= r.y && o.y < r.y + r.w,
      );
      if (circle) {
        const cx = circle.x + circle.w / 2, cy = circle.y + circle.w / 2, rad = circle.w / 2 - EDGE_MARGIN_IN / 2;
        const corners = [[o.x, o.y], [o.x + ext.w, o.y], [o.x, o.y + ext.h], [o.x + ext.w, o.y + ext.h]];
        if (corners.some(([px, py]) => Math.hypot(px - cx, py - cy) > rad + EPS)) {
          issues.push({ level: "error", field: f.id, message: `code is ${ext.w.toFixed(2)} in wide, too big for the circle` });
        }
      } else if (o.x + ext.w > rightLimit(t, at, ext.h) + EPS) {
        issues.push({ level: "error", field: f.id, message: `code is ${ext.w.toFixed(2)} in wide but only ${(rightLimit(t, at, ext.h) - o.x).toFixed(2)} in is free` });
      }
      if (o.y + ext.h > t.heightIn + EPS) {
        issues.push({ level: "error", field: f.id, message: `code is ${ext.h.toFixed(2)} in tall, past the label bottom` });
      }
    }
  }
  return issues;
}
