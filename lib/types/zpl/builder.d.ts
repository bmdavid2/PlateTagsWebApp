import type { LabelData, LabelTemplate } from "../labels/types";
import { type ZplOrientation } from "./elements";
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
    map: (xIn: number, yIn: number) => {
        xIn: number;
        yIn: number;
    };
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
export declare function rotationTransform(template: LabelTemplate): RotationTransform;
/**
 * Build ZPL for `data`, honoring the copy count. Each copy is generated
 * independently so uuid-mode QR codes are unique per label.
 */
export declare function buildLabelZpl(data: LabelData): string;
/** Build ZPL for a batch of label rows, concatenated. */
export declare function buildBatchZpl(rows: LabelData[]): string;
