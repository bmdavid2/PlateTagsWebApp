import { useRef } from "react";
import { parseCsv, toCsv } from "../batch/csv";
import { emptyRow, MAX_LINES, type BatchRow } from "../batch/table";

// Editable batch grid over the CSV schema (count, QR, line_1..line_7).
// Supports CSV import, template download, add/remove rows, and CSV export.

export function BatchTable({
  rows,
  onChange,
}: {
  rows: BatchRow[];
  onChange: (rows: BatchRow[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function updateRow(i: number, patch: Partial<BatchRow>) {
    const next = rows.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }

  function updateLine(i: number, li: number, value: string) {
    const next = rows.slice();
    const lines = next[i].lines.slice();
    lines[li] = value;
    next[i] = { ...next[i], lines };
    onChange(next);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    onChange(parsed.length ? parsed : [emptyRow()]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function download(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const templateCsv =
    "count,QR," +
    Array.from({ length: MAX_LINES }, (_, i) => `line_${i + 1}`).join(",") +
    "\n3,TRUE,P jensen,circle,red,,,,\n";

  return (
    <div>
      <div className="row-actions" style={{ marginTop: 0, marginBottom: "0.75rem" }}>
        <button className="secondary" onClick={() => fileRef.current?.click()}>
          Import CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv" hidden onChange={handleImport} />
        <button className="secondary" onClick={() => download("template.csv", templateCsv)}>
          Download template
        </button>
        <button className="secondary" onClick={() => download("labels.csv", toCsv(rows))}>
          Export CSV
        </button>
        <button className="secondary" onClick={() => onChange([...rows, emptyRow()])}>
          Add row
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="batch">
          <thead>
            <tr>
              <th>#</th>
              <th>Count</th>
              <th>QR</th>
              {Array.from({ length: MAX_LINES }, (_, i) => (
                <th key={i}>line_{i + 1}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td style={{ width: 60 }}>
                  <input
                    type="number"
                    min={1}
                    value={row.count}
                    onChange={(e) => updateRow(i, { count: parseInt(e.target.value, 10) || 1 })}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={row.qr}
                    onChange={(e) => updateRow(i, { qr: e.target.checked })}
                  />
                </td>
                {row.lines.map((line, li) => (
                  <td key={li}>
                    <input type="text" value={line} onChange={(e) => updateLine(i, li, e.target.value)} />
                  </td>
                ))}
                <td>
                  <button
                    className="secondary"
                    onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                    disabled={rows.length <= 1}
                    title="Remove row"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
