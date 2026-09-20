import { useMemo, useState } from "react";
import { TEMPLATES, getTemplate } from "./labels/templates";
import type { LabelData } from "./labels/types";
import { buildBatchZpl, buildLabelZpl } from "./zpl/builder";
import { rowToLabelData, emptyRow, type BatchRow } from "./batch/table";
import { TemplatePicker } from "./ui/TemplatePicker";
import { FieldForm } from "./ui/FieldForm";
import { LayoutControls } from "./ui/LayoutControls";
import { LabelPreview } from "./ui/LabelPreview";
import { PrintPanel } from "./ui/PrintPanel";
import { BatchTable } from "./ui/BatchTable";
import { validateLabelQr, validateBatchRow } from "./qr/validation";

type Tab = "single" | "batch";

function initialLabelData(templateId: string): LabelData {
  const t = getTemplate(templateId);
  return {
    templateId,
    values: {},
    overrides: {},
    printCode: t.printCodeDefault ?? true,
    count: 1,
  };
}

export default function App() {
  const [tab, setTab] = useState<Tab>("single");
  const [showLayout, setShowLayout] = useState(false);

  // Single-label state
  const [data, setData] = useState<LabelData>(initialLabelData(TEMPLATES[0].id));
  const singleZpl = useMemo(() => buildLabelZpl(data), [data]);
  const codeError = useMemo(
    () => validateLabelQr(data, getTemplate(data.templateId)),
    [data],
  );

  // Batch state
  const [batchTemplateId, setBatchTemplateId] = useState(TEMPLATES[0].id);
  const [rows, setRows] = useState<BatchRow[]>([emptyRow()]);
  const batchZpl = useMemo(
    () => buildBatchZpl(rows.map((r) => rowToLabelData(batchTemplateId, r))),
    [rows, batchTemplateId],
  );
  const batchHasErrors = useMemo(() => {
    const batchTemplate = getTemplate(batchTemplateId);
    return rows.some((r) => validateBatchRow(r, batchTemplate) != null);
  }, [rows, batchTemplateId]);

  function changeTemplate(id: string) {
    // Reset overrides/values when switching template, since field ids differ.
    setData(initialLabelData(id));
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>PlateTags</h1>
        <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
          Label designer · Zebra ZD621 · ZPL
        </span>
      </header>

      <div className="tabs">
        <button className={`tab ${tab === "single" ? "active" : ""}`} onClick={() => setTab("single")}>
          Single label
        </button>
        <button className={`tab ${tab === "batch" ? "active" : ""}`} onClick={() => setTab("batch")}>
          Batch (CSV / table)
        </button>
      </div>

      {tab === "single" ? (
        <div className="layout">
          <div>
            <div className="panel" style={{ marginBottom: "1rem" }}>
              <h2>Label</h2>
              <TemplatePicker value={data.templateId} onChange={changeTemplate} />
              <FieldForm data={data} onChange={setData} />
            </div>
            <div className="panel">
              <button
                type="button"
                className="secondary advanced-toggle"
                aria-expanded={showLayout}
                onClick={() => setShowLayout((v) => !v)}
              >
                {showLayout ? "▾" : "▸"} Advanced — Layout
              </button>
              {showLayout && (
                <div className="advanced-body">
                  <LayoutControls data={data} onChange={setData} />
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="panel" style={{ marginBottom: "1rem" }}>
              <h2>Preview</h2>
              <div className="preview-wrap">
                <LabelPreview data={data} />
              </div>
            </div>
            <div className="panel">
              <h2>Print</h2>
              {codeError && <p className="status error">{codeError}</p>}
              <PrintPanel zpl={singleZpl} disabled={!!codeError} />
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="panel" style={{ marginBottom: "1rem" }}>
            <h2>Batch labels</h2>
            <TemplatePicker value={batchTemplateId} onChange={setBatchTemplateId} />
            <p className="hint">
              Import a CSV (count, PrintCode, Code, line_1…line_7) or edit rows directly. Each row
              prints its own copy count; leave Code blank to auto-generate.
            </p>
            <BatchTable rows={rows} onChange={setRows} templateId={batchTemplateId} />
          </div>
          <div className="panel">
            <h2>Print batch</h2>
            <PrintPanel zpl={batchZpl} disabled={rows.length === 0 || batchHasErrors} />
          </div>
        </div>
      )}
    </div>
  );
}
