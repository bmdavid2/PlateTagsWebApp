export declare function inchesToDots(inches: number, dpi: number): number;
/**
 * Convert a text height in inches to a ZPL scalable-font height in dots.
 * ZPL font `0` takes an explicit height/width in dots via ^A0,h,w.
 */
export declare function fontHeightDots(sizeInches: number, dpi: number): number;
