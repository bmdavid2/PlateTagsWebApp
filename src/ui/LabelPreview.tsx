import { useEffect, useState } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import bwipjs from "bwip-js/browser";
import { getTemplate } from "../labels/templates";
import { resolveField } from "../labels/resolve";
import type { LabelData } from "../labels/types";
import { truncate } from "../zpl/elements";
import { resolveQrPayload } from "../qr/content";

// To-scale SVG rendering of a label, mirroring what the ZPL will print.
// Uses a fixed pixels-per-inch for on-screen scale (independent of printer dpi).

const PX_PER_IN = 120;

/**
 * Render a Code128 barcode to a PNG data URL by drawing it into a detached
 * SVG element (jsbarcode requires a DOM node), then serializing that SVG.
 * Returns null if encoding fails (e.g. empty data).
 */
function renderBarcodeDataUrl(value: string, showText: boolean): string | null {
  try {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(el, value, {
      format: "CODE128",
      displayValue: showText,
      margin: 0,
      height: 40,
      width: 2,
    });
    const xml = new XMLSerializer().serializeToString(el);
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`;
  } catch {
    return null;
  }
}

/**
 * Render a PDF417 stacked barcode to a PNG data URL via bwip-js, mirroring what
 * the ZPL ^B7 will print. `rows` matches the template's row count so the
 * on-screen aspect ratio tracks the printed code. We draw to a detached canvas
 * and export PNG because an SVG-in-SVG data URI does not paint reliably inside
 * the preview's outer <svg> (same reason the QR path uses PNG). Returns null on
 * failure (e.g. empty data).
 */
function renderPdf417DataUrl(value: string, rows: number): string | null {
  try {
    const canvas = document.createElement("canvas");
    // rows/columns/eclevel/includetext are PDF417-specific bwip-js options not
    // in the shared RenderOptions type, so pass the object through a cast.
    bwipjs.toCanvas(canvas, {
      bcid: "pdf417",
      text: value,
      rows,
      columns: 0, // auto
      eclevel: 2,
      includetext: false,
      scale: 3, // crisp at the small on-screen size
    } as Parameters<typeof bwipjs.toCanvas>[1]);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export function LabelPreview({ data }: { data: LabelData }) {
  const template = getTemplate(data.templateId);
  const rotate = template.rotate ?? 0;
  // Rotated (printed) dimensions in inches. Content is authored in design space
  // (widthIn × heightIn).
  const rotated = rotate === 90 || rotate === 270;
  const outWidthIn = rotated ? template.heightIn : template.widthIn;
  const outHeightIn = rotated ? template.widthIn : template.heightIn;
  const w = outWidthIn * PX_PER_IN;
  const h = outHeightIn * PX_PER_IN;
  // Group transform matching builder's map(). Only 90°/270° reflect field
  // coordinates (builder.ts still reorients those per-field, R/B orientation).
  // 180° is NOT reflected here: builder.ts renders those fields at their
  // natural (unrotated) coordinates and lets the printer's ^POI invert the
  // whole composed label at print time — a media-orientation concern, not a
  // redraw of the design — so the unrotated coordinates already are the
  // correct final look. Rotating the preview group here would double-flip it.
  //  90°:  translate(H,0) rotate(90)   → (x,y) → (H−y, x)
  //  270°: translate(0,W) rotate(-90)  → (x,y) → (y, W−x)
  const groupTransform =
    rotate === 90
      ? `translate(${template.heightIn},0) rotate(90)`
      : rotate === 270
        ? `translate(0,${template.widthIn}) rotate(-90)`
        : undefined;

  // Resolve QR (square) and barcode (rectangular) images for the preview.
  // In uuid mode the payload changes with the data, which is fine for a preview.
  const [qrPaths, setQrPaths] = useState<{ x: number; y: number; size: number; png: string }[]>([]);
  const [barcodes, setBarcodes] = useState<
    { x: number; y: number; w: number; h: number; url: string }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      const paths: { x: number; y: number; size: number; png: string }[] = [];
      const bars: { x: number; y: number; w: number; h: number; url: string }[] = [];

      // Resolve every encoded field's payload once, honoring mirrorPayloadOf so
      // a QR and its PDF417 copy show the identical uuid (matches builder.ts).
      const payloads: Record<string, string | null> = {};
      const encoded = template.fields.filter(
        (f) => f.kind === "qr" || f.kind === "barcode" || f.kind === "pdf417",
      );
      for (const f of encoded) {
        if (!f.mirrorPayloadOf) payloads[f.id] = resolveQrPayload(f, data);
      }
      for (const f of encoded) {
        if (f.mirrorPayloadOf) payloads[f.id] = payloads[f.mirrorPayloadOf] ?? null;
      }

      for (const base of template.fields) {
        const field = resolveField(base, data);

        if (field.kind === "qr") {
          if (!data.qr) continue;
          const payload = payloads[field.id];
          if (!payload) continue;
          try {
            // True printed size: the QR's module count (version-dependent, from
            // the payload) × magnification ÷ dpi. This matches what ZPL ^BQN,2,mag
            // prints, so centering on screen equals centering on the label.
            const moduleCount = QRCode.create(payload, { errorCorrectionLevel: "M" }).modules.size;
            const sizeIn = (moduleCount * Math.max(1, Math.round(field.size))) / template.dpi;
            // PNG data URL renders reliably inside an SVG <image>, unlike an
            // SVG-in-SVG data URI. 256px is plenty for the on-screen scale.
            const png = await QRCode.toDataURL(payload, {
              margin: 0,
              errorCorrectionLevel: "M",
              width: 256,
            });
            const origins = [{ x: field.x, y: field.y }, ...(field.mirrorOrigins ?? [])];
            for (const o of origins) paths.push({ x: o.x, y: o.y, size: sizeIn, png });
          } catch {
            /* ignore preview QR errors */
          }
        } else if (field.kind === "barcode") {
          if (!data.qr) continue; // same toggle as QR
          const payload = payloads[field.id];
          if (!payload) continue;
          const url = renderBarcodeDataUrl(payload, !!field.barcodeShowText);
          if (!url) continue;
          bars.push({
            x: field.x,
            y: field.y,
            w: field.barcodeWidthIn ?? template.widthIn - field.x,
            h: field.size,
            url,
          });
        } else if (field.kind === "pdf417") {
          if (!data.qr) continue; // same toggle as QR
          const payload = payloads[field.id];
          if (!payload) continue;
          const url = renderPdf417DataUrl(payload, field.pdf417Rows ?? 3);
          if (!url) continue;
          bars.push({
            x: field.x,
            y: field.y,
            w: field.barcodeWidthIn ?? template.widthIn - field.x,
            h: field.size,
            url,
          });
        }
      }
      if (!cancelled) {
        setQrPaths(paths);
        setBarcodes(bars);
      }
    }
    render();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data)]);

  return (
    <svg
      className="preview-canvas"
      width={w}
      height={h}
      viewBox={`0 0 ${outWidthIn} ${outHeightIn}`}
    >
      <g transform={groupTransform}>
      {/* Die-cut region guides (cosmetic) */}
      {template.regions?.map((r, i) =>
        r.shape === "circle" ? (
          <circle
            key={`r${i}`}
            cx={r.x + r.w / 2}
            cy={r.y + r.h / 2}
            r={r.w / 2}
            fill="none"
            stroke="#c8ccd2"
            strokeWidth={0.01}
            strokeDasharray="0.04 0.03"
          />
        ) : (
          <rect
            key={`r${i}`}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill="none"
            stroke="#c8ccd2"
            strokeWidth={0.01}
            strokeDasharray="0.04 0.03"
          />
        ),
      )}

      {/* Text fields */}
      {template.fields.map((base) => {
        const field = resolveField(base, data);
        // Centered text anchors at the middle of its block; left text at x.
        const centered = field.align === "center" && field.blockWidthIn;
        const tx = centered ? field.x + (field.blockWidthIn ?? 0) / 2 : field.x;
        const anchor = centered ? "middle" : "start";
        if (field.kind === "text") {
          const text = data.values[field.sourceField ?? field.id] ?? "";
          if (!text.trim()) return null;
          return (
            <text
              key={field.id}
              x={tx}
              y={field.y + field.size}
              fontSize={field.size}
              fontFamily="monospace"
              textAnchor={anchor}
            >
              {truncate(text, field.maxChars)}
            </text>
          );
        }
        return null;
      })}

      {/* QR codes rendered as embedded PNG images */}
      {qrPaths.map((q, i) => (
        <image key={i} x={q.x} y={q.y} width={q.size} height={q.size} href={q.png} />
      ))}

      {/* Code128 barcodes (do not preserve aspect ratio so they fill the budget) */}
      {barcodes.map((b, i) => (
        <image
          key={`bc${i}`}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          href={b.url}
          preserveAspectRatio="none"
        />
      ))}
      </g>
    </svg>
  );
}
