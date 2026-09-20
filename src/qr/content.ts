import { v4 as uuidv4 } from "uuid";
import type { FieldSpec, LabelData } from "../labels/types";

/**
 * Resolve the payload an encoded field (QR or barcode) should carry for one
 * label. The field's `qrMode` (template-fixed, not user-selectable) decides
 * the format:
 *
 * - "uuid": `data.code` if the user supplied one (pre-specified), else a
 *   fresh uuid4 per label (matches the old backend behavior).
 * - "shortId": `data.code` if supplied, else a fresh 7-hex-character code
 *   per label — for fields too width-constrained to fit a full uuid. Paired
 *   with `pdf417Rows: 4` on the PDF417 fields that use it (microplate/bottle
 *   in templates.ts), 7 hex chars is a *deterministic* fit: a 10,000-sample
 *   sweep with bwip-js never needed more than 4 columns (always exactly 4),
 *   giving a fixed 1.35" width at the ZPL minimum module size — no
 *   worst-case tail risk, unlike the 3-row minimum (which hits a structural
 *   width floor around 1.5-1.7" regardless of how short the payload is,
 *   since PDF417's per-row minimum codeword count dominates at only 3 rows).
 *   Keyspace 16^7 ≈ 268 million — no realistic collision risk for label
 *   batches.
 * - "field": the value of the field's configured source field. `data.code`
 *   does not apply here — the payload is already user-controlled via the
 *   source field's own text input, so there's nothing to override.
 *
 * A pre-specified `data.code` is assumed already validated (see
 * src/qr/validation.ts) by the UI before this runs — printing/export is
 * blocked on invalid input, so this function just trusts its caller.
 *
 * Returns null when the source field is empty in "field" mode, so the caller
 * can decide to omit the code rather than encode an empty string.
 */
export function resolveQrPayload(field: FieldSpec, data: LabelData): string | null {
  const mode = field.qrMode ?? "uuid";
  if (mode === "uuid" || mode === "shortId") {
    const manual = data.code?.trim();
    if (manual) return manual.toLowerCase();
    return mode === "uuid" ? uuidv4() : uuidv4().replace(/-/g, "").slice(0, 7);
  }
  const src = field.qrSourceField;
  if (!src) return null;
  const value = data.values[src]?.trim();
  return value ? value : null;
}
