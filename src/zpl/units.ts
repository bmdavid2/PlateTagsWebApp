// Unit conversion. ZPL positions everything in dots; templates specify inches so
// that a template is resolution-independent. dots = round(inches * dpi).

export function inchesToDots(inches: number, dpi: number): number {
  return Math.round(inches * dpi);
}

/**
 * Convert a text height in inches to a ZPL scalable-font height in dots.
 * ZPL font `0` takes an explicit height/width in dots via ^A0,h,w.
 */
export function fontHeightDots(sizeInches: number, dpi: number): number {
  return Math.max(1, inchesToDots(sizeInches, dpi));
}
