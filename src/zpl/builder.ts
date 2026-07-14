// Compose ZPL for one or more labels from a template + resolved field values.

import { getTemplate } from "../labels/templates";
import { resolveField } from "../labels/resolve";
import type { LabelData, LabelTemplate } from "../labels/types";
import { resolveQrPayload } from "../qr/content";
import {
  barcodeElement,
  pdf417Element,
  qrElement,
  textElement,
  type ZplOrientation,
} from "./elements";
import { inchesToDots } from "./units";

/**
 * A coordinate transform for a template's rotation. Fields are authored in the
 * unrotated design space (template.widthIn × heightIn); `map` converts a design
 * origin (inches) into the printed/previewed space, and `orientation` is the
 * ZPL field orientation that rotates the glyphs/bars to match. This mirrors an
 * SVG `translate + rotate`, so builder and preview stay in lockstep.
 *
 * - 0°:   (x,y) → (x,y),        N. Output dims = W×H.
 * - 90°:  (x,y) → (H−y, x),     R (clockwise). Output dims = H×W.
 * - 180°: (x,y) → (W−x, H−y),   I (inverted). Output dims = W×H.
 * - 270°: (x,y) → (y, W−x),     B (counter-clockwise). Output dims = H×W.
 */
export interface RotationTransform {
  map: (xIn: number, yIn: number) => { xIn: number; yIn: number };
  orientation: ZplOrientation;
  outWidthIn: number;
  outHeightIn: number;
  /**
   * When true, emit ^POI so the printer inverts the whole composed label,
   * instead of reflecting each field's coordinates. ZPL's ^FO always anchors
   * the top-left of a field's bounding box in its pre-rotation design space —
   * orientation only rotates the glyphs/modules in place, it does not flip
   * which direction the box grows from that origin. Reflecting coordinates
   * while also flipping orientation to "I" therefore double-transforms
   * near-edge fields (confirmed by rendering through Labelary): a QR or text
   * line anchored close to one edge overflows straight past the label
   * boundary and gets clipped. ^PO sidesteps this entirely by inverting the
   * already-composed label as one step, so fields keep their natural
   * (unrotated) coordinates and orientation "N".
   */
  poInvert?: boolean;
}

export function rotationTransform(template: LabelTemplate): RotationTransform {
  const W = template.widthIn;
  const H = template.heightIn;
  switch (template.rotate) {
    case 90:
      return {
        map: (x, y) => ({ xIn: H - y, yIn: x }),
        orientation: "R",
        outWidthIn: H,
        outHeightIn: W,
      };
    case 180:
      return {
        map: (x, y) => ({ xIn: x, yIn: y }),
        orientation: "N",
        outWidthIn: W,
        outHeightIn: H,
        poInvert: true,
      };
    case 270:
      return {
        map: (x, y) => ({ xIn: y, yIn: W - x }),
        orientation: "B",
        outWidthIn: H,
        outHeightIn: W,
      };
    default:
      return {
        map: (x, y) => ({ xIn: x, yIn: y }),
        orientation: "N",
        outWidthIn: W,
        outHeightIn: H,
      };
  }
}

/**
 * Resolve the payload for every encoded (qr/barcode/pdf417) field once per
 * label, keyed by field id. A field with `mirrorPayloadOf` reuses its source's
 * already-resolved payload verbatim, so e.g. a QR and a PDF417 copy carry the
 * *identical* per-label uuid rather than each minting their own. Because this
 * runs once per label (buildBody is called per copy), uuid-mode payloads still
 * differ across copies.
 */
function resolvePayloads(template: LabelTemplate, data: LabelData): Record<string, string | null> {
  const payloads: Record<string, string | null> = {};
  const encoded = template.fields.filter(
    (f) => f.kind === "qr" || f.kind === "barcode" || f.kind === "pdf417",
  );
  // First pass: fields that resolve independently.
  for (const f of encoded) {
    if (!f.mirrorPayloadOf) payloads[f.id] = resolveQrPayload(f, data);
  }
  // Second pass: mirror fields copy their source's resolved payload.
  for (const f of encoded) {
    if (f.mirrorPayloadOf) payloads[f.id] = payloads[f.mirrorPayloadOf] ?? null;
  }
  return payloads;
}

/**
 * Build the ZPL body (the fields between ^XA and ^XZ) for a single label.
 * QR payloads are resolved here, so calling this once per copy yields a fresh
 * uuid per copy in "uuid" mode.
 */
function buildBody(template: LabelTemplate, data: LabelData): string {
  const parts: string[] = [];
  const payloads = resolvePayloads(template, data);
  const rot = rotationTransform(template);
  const orientation = rot.orientation;

  for (const base of template.fields) {
    const field = resolveField(base, data);
    // Map the field's design-space origin into printed space.
    const p = rot.map(field.x, field.y);

    if (field.kind === "text") {
      // A mirror field echoes another field's value (e.g. the circle cap-label).
      const text = data.values[field.sourceField ?? field.id] ?? "";
      if (!text.trim()) continue; // skip empty lines
      parts.push(
        textElement({
          xIn: p.xIn,
          yIn: p.yIn,
          sizeIn: field.size,
          text,
          dpi: template.dpi,
          font: field.font,
          maxChars: field.maxChars,
          align: field.align,
          blockWidthIn: field.blockWidthIn,
          orientation,
        }),
      );
    } else if (field.kind === "qr") {
      if (!data.qr) continue;
      const payload = payloads[field.id];
      if (!payload) continue;
      const origins = [{ x: field.x, y: field.y }, ...(field.mirrorOrigins ?? [])];
      for (const o of origins) {
        const po = rot.map(o.x, o.y);
        parts.push(
          qrElement({
            xIn: po.xIn,
            yIn: po.yIn,
            magnification: field.size,
            data: payload,
            dpi: template.dpi,
            orientation,
          }),
        );
      }
    } else if (field.kind === "barcode") {
      if (!data.qr) continue; // the "generate code" toggle governs all code kinds alike
      const payload = payloads[field.id];
      if (!payload) continue;
      parts.push(
        barcodeElement({
          xIn: p.xIn,
          yIn: p.yIn,
          heightIn: field.size,
          widthIn: field.barcodeWidthIn ?? template.widthIn - field.x,
          data: payload,
          dpi: template.dpi,
          showText: field.barcodeShowText,
          orientation,
        }),
      );
    } else if (field.kind === "pdf417") {
      if (!data.qr) continue;
      const payload = payloads[field.id];
      if (!payload) continue;
      parts.push(
        pdf417Element({
          xIn: p.xIn,
          yIn: p.yIn,
          heightIn: field.size,
          widthIn: field.barcodeWidthIn ?? template.widthIn - field.x,
          data: payload,
          dpi: template.dpi,
          rows: field.pdf417Rows,
          orientation,
        }),
      );
    }
  }

  return parts.join("");
}

/**
 * Wrap a body in a ^XA…^XZ block with label dimensions set (^PW / ^LL). When the
 * template is rotated, ^PW/^LL use the rotated (printed) dimensions so the media
 * bounds match how the content was transformed in buildBody.
 */
function wrapLabel(template: LabelTemplate, body: string): string {
  const rot = rotationTransform(template);
  const pw = inchesToDots(rot.outWidthIn, template.dpi); // print width
  const ll = inchesToDots(rot.outHeightIn, template.dpi); // label length
  const po = rot.poInvert ? "^POI" : "";
  return `^XA${po}^PW${pw}^LL${ll}^LH0,0${body}^XZ`;
}

/**
 * Build ZPL for `data`, honoring the copy count. Each copy is generated
 * independently so uuid-mode QR codes are unique per label.
 */
export function buildLabelZpl(data: LabelData): string {
  const template = getTemplate(data.templateId);
  const copies = Math.max(1, Math.floor(data.count || 1));
  const labels: string[] = [];
  for (let i = 0; i < copies; i++) {
    labels.push(wrapLabel(template, buildBody(template, data)));
  }
  return labels.join("\n");
}

/** Build ZPL for a batch of label rows, concatenated. */
export function buildBatchZpl(rows: LabelData[]): string {
  return rows.map(buildLabelZpl).join("\n");
}
