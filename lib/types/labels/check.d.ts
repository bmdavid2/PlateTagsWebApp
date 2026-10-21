import type { LabelData } from "./types";
export interface LabelIssue {
    level: "error" | "warn";
    /** Field id the issue concerns. */
    field: string;
    message: string;
}
export declare function checkLabel(data: LabelData): LabelIssue[];
