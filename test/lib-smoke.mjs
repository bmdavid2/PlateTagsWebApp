// Loads the built bundle as a plain ES module and prints a label's ZPL.
import { TEMPLATES, buildLabelZpl, rowToLabelData, validateBatchRow, getTemplate } from "../lib/platetags-core.js";
console.log(TEMPLATES.map((t) => t.id).join(","));
for (const t of TEMPLATES) {
  const row = { count: 1, printCode: true, code: "abc1234", lines: ["INV-000123", "Tris HCl 1M", "", "", "", "", ""] };
  const err = validateBatchRow(row, getTemplate(t.id));
  console.log(t.id, err ?? "valid code");
  console.log(buildLabelZpl(rowToLabelData(t.id, t.id === "cryotube" ? { ...row, code: "8f14e45f-ceea-467f-a0e6-b906e4a5d7c1" } : row)));
}
