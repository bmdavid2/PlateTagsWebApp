// Golden test for ZPL generation. Renders ZPL for every template over a matrix
// of inputs and either writes (--update) or compares against test/golden/zpl.golden.txt.
//   npx tsx test/golden-zpl.ts --update   # (re)record
//   npx tsx test/golden-zpl.ts            # compare; exit 1 on any difference
//   GOLDEN_IMPL=lib npx tsx test/golden-zpl.ts   # compare using the built lib bundle
// uuid4 is made deterministic by replacing node:crypto's randomFillSync with a
// seeded generator before the builder is loaded.

import crypto, { randomFillSync as _orig } from "node:crypto";
import { syncBuiltinESMExports } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let state = 12345;
function rnd(): number {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state >>> 24;
}
(crypto as any).randomFillSync = (buf: Uint8Array) => {
  for (let i = 0; i < buf.length; i++) buf[i] = rnd();
  return buf;
};
// uuid v4() short-circuits to crypto.randomUUID() when available.
function seededUuid(): string {
  const b = new Uint8Array(16);
  for (let i = 0; i < 16; i++) b[i] = rnd();
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
(crypto as any).randomUUID = seededUuid;
syncBuiltinESMExports();
void _orig;
// uuid may resolve to its browser build, which uses Web Crypto instead.
Object.defineProperty(globalThis.crypto, "getRandomValues", { value: (b: Uint8Array) => (crypto as any).randomFillSync(b), configurable: true, writable: true });
Object.defineProperty(globalThis.crypto, "randomUUID", { value: seededUuid, configurable: true, writable: true });

// GOLDEN_IMPL=lib runs the same matrix against the built bundle (lib/platetags-core.js).
const impl: any = process.env.GOLDEN_IMPL === "lib" ? await import("../lib/platetags-core.js") : null;
const { buildLabelZpl, buildBatchZpl } = impl ?? (await import("../src/zpl/builder.ts"));
const { TEMPLATES } = impl ?? (await import("../src/labels/templates.ts"));
const { rowToLabelData } = impl ?? (await import("../src/batch/table.ts"));
import type { LabelData } from "../src/labels/types.ts";

const LINES = [
  "",
  "A1",
  "Plate 0042",
  "Escherichia coli K-12 MG1655",
  "Pseudomonas aeruginosa PAO1 ΔlasR 2026-10-21 rack 7 shelf 3",
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "caret^ and~tilde, comma",
];
const CODES = [undefined, "8f14e45f-ceea-467f-a0e6-b906e4a5d7c1", "abc1234", "ABC1234"];
const out: string[] = [];

for (const t of TEMPLATES) {
  const textIds = t.fields.filter((f) => f.kind === "text" && !f.sourceField).map((f) => f.id);
  for (const printCode of [true, false]) {
    for (const [li, lineVal] of LINES.entries()) {
      for (const count of [1, 3]) {
        for (const code of CODES) {
          const values: Record<string, string> = {};
          textIds.forEach((id, i) => (values[id] = i === 0 ? lineVal : LINES[(li + i) % LINES.length]));
          const d: LabelData = { templateId: t.id, values, overrides: {}, printCode, code, count };
          out.push(`### ${t.id} printCode=${printCode} line=${li} count=${count} code=${code ?? "-"}`);
          out.push(buildLabelZpl(d));
        }
      }
    }
  }
  // manual layout overrides (size set => auto-fit skipped)
  const first = textIds[0];
  const od: LabelData = {
    templateId: t.id,
    values: Object.fromEntries(textIds.map((id) => [id, LINES[4]])),
    overrides: { [first]: { x: 0.2, y: 0.1, size: 0.08, font: "A" } },
    printCode: true,
    count: 2,
  };
  out.push(`### ${t.id} overrides`);
  out.push(buildLabelZpl(od));
  // batch path
  const rows = [
    { count: 2, printCode: true, lines: LINES.slice(0, 7) },
    { count: 1, printCode: false, code: "abc1234", lines: ["x", "y", "", "", "", "", ""] },
  ];
  out.push(`### ${t.id} batch`);
  out.push(buildBatchZpl(rows.map((r) => rowToLabelData(t.id, r))));
}

// Second matrix: freeCode / mirrorText / checkLabel (added after the original goldens;
// kept in its own file so zpl.golden.txt still proves the original behavior is untouched).
const { checkLabel } = impl ?? (await import("../src/labels/check.ts"));
const out2: string[] = [];
const FREE = ["INV-000123", "Abc-0042", "INV-AB12CD34EF", "Tris/NaCl-0042-LONGER-CODE-XYZ", "x^y", "héllo", "8f14e45f-ceea-467f-a0e6-b906e4a5d7c1"];
const CAPS = [undefined, "Tris/NaCl", "A very long cap name here"];
for (const t of TEMPLATES) {
  const textIds = t.fields.filter((f) => f.kind === "text" && !f.sourceField).map((f) => f.id);
  for (const code of FREE) for (const cap of CAPS) for (const printCode of [true, false]) {
    const values = Object.fromEntries(textIds.map((id, i) => [id, i === 0 ? "INV-000123" : "Tris 50 mM, NaCl 150 mM, pH 7.4"]));
    const d: LabelData = { templateId: t.id, values, overrides: {}, printCode, code, freeCode: true, mirrorText: cap ? { cap_id: cap } : undefined, count: 1 };
    out2.push(`### ${t.id} free code=${code} cap=${cap ?? "-"} printCode=${printCode}`);
    out2.push(buildLabelZpl(d));
    out2.push(JSON.stringify(checkLabel(d)));
  }
}
const text2 = out2.join("\n") + "\n";
const text = out.join("\n") + "\n";
const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, "golden/zpl.golden.txt");
if (process.argv.includes("--update")) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  writeFileSync(resolve(here, "golden/zpl-free.golden.txt"), text2);
  console.log(`wrote ${file} (${text.length} bytes, ${out.length / 2} cases)`);
} else {
  if (!existsSync(file)) { console.error("no golden file; run with --update"); process.exit(2); }
  const want2 = readFileSync(resolve(here, "golden/zpl-free.golden.txt"), "utf8");
  if (want2 !== text2) { console.error("zpl-free.golden.txt MISMATCH"); process.exit(1); }
  const want = readFileSync(file, "utf8");
  if (want === text) console.log(`OK: identical (${text.length} bytes, ${out.length / 2} cases)`);
  else {
    const a = want.split("\n"), b = text.split("\n");
    const i = a.findIndex((l, k) => l !== b[k]);
    console.error(`MISMATCH at line ${i + 1}\n want: ${a[i]}\n got:  ${b[i]}`);
    process.exit(1);
  }
}
