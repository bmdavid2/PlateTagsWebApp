import type { LabelData } from "../labels/types";
export declare const MAX_LINES = 7;
export interface BatchRow {
    count: number;
    printCode: boolean;
    /** Pre-specified code value; blank/absent means auto-generate. */
    code?: string;
    /** line_1..line_7 values, indexed 0..6. */
    lines: string[];
}
export declare function emptyRow(): BatchRow;
/** Convert a batch row to LabelData for the given template. */
export declare function rowToLabelData(templateId: string, row: BatchRow): LabelData;
