import { v4 as uuidv4 } from "uuid";
import type { FieldSpec, LabelData } from "../labels/types";

/**
 * Resolve the payload an encoded field (QR or barcode) should carry for one
 * label.
 *
 * - "uuid": a fresh uuid4 per label (matches the old backend behavior).
 * - "field": the value of the configured source field from the label data.
 * - "shortId": a fresh 7-hex-character code per label — for fields too
 *   width-constrained to fit a full uuid. Paired with `pdf417Rows: 4` on the
 *   PDF417 fields that use it (microplate/bottle in templates.ts), 7 hex
 *   chars is a *deterministic* fit: a 10,000-sample sweep with bwip-js never
 *   needed more than 4 columns (always exactly 4), giving a fixed 1.35" width
 *   at the ZPL minimum module size — no worst-case tail risk, unlike the
 *   3-row minimum (which hits a structural width floor around 1.5-1.7"
 *   regardless of how short the payload is, since PDF417's per-row minimum
 *   codeword count dominates at only 3 rows). Keyspace 16^7 ≈ 268 million —
 *   no realistic collision risk for label batches.
 *
 * Returns null when the source field is empty in "field" mode, so the caller
 * can decide to omit the code rather than encode an empty string.
 */
export function resolveQrPayload(field: FieldSpec, data: LabelData): string | null {
  // A per-label override (from the UI) wins over the template default.
  const mode = data.qrMode ?? field.qrMode ?? "uuid";
  if (mode === "uuid") {
    return uuidv4();
  }
  if (mode === "shortId") {
    return uuidv4().replace(/-/g, "").slice(0, 7);
  }
  const src = data.qrSourceField ?? field.qrSourceField;
  if (!src) return null;
  const value = data.values[src]?.trim();
  return value ? value : null;
}
