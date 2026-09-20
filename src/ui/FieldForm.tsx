import { getTemplate } from "../labels/templates";
import { MIN_FONT_SIZE_IN, resolveField } from "../labels/resolve";
import type { LabelData } from "../labels/types";
import { getCodeField, validateManualValue } from "../qr/validation";

// Field entry for a single label: text lines + print-code toggle + optional
// pre-specified code + copy count. A code field's format (uuid/shortId/field)
// is fixed by the template, not user-selectable — the form just offers a
// blank-means-generate "Code" input for uuid/shortId fields.
// Text field font size auto-shrinks to fit (see resolveField); the hint below
// each input surfaces that so the user knows why their text looks smaller.

export function FieldForm({
  data,
  onChange,
}: {
  data: LabelData;
  onChange: (next: LabelData) => void;
}) {
  const template = getTemplate(data.templateId);
  // Mirror fields (sourceField set) echo another field and take no own input.
  const textFields = template.fields.filter((f) => f.kind === "text" && !f.sourceField);
  // The primary encoded field is a QR, Code128, or PDF417 that resolves its own
  // payload. Mirror fields (mirrorPayloadOf) just copy it, so they're not the
  // one whose content the form controls.
  const codeField = getCodeField(template);
  const codeNoun = codeField?.kind === "qr" ? "QR code" : "barcode";
  const codeMode = codeField?.qrMode ?? "uuid";
  const codeError = codeField ? validateManualValue(codeField, data.code ?? "", template.dpi) : null;

  function setValue(id: string, value: string) {
    onChange({ ...data, values: { ...data.values, [id]: value } });
  }

  return (
    <div>
      {textFields.map((f) => {
        const resolved = resolveField(f, data);
        const text = data.values[f.id] ?? "";
        const shrunk = resolved.maxWidthIn != null && resolved.size < f.size - 0.001;
        const overflowing =
          shrunk && resolved.size <= MIN_FONT_SIZE_IN + 0.001 && !!resolved.maxChars && text.length > resolved.maxChars;
        return (
          <label className="field" key={f.id}>
            <span>{f.label ?? f.id}</span>
            <input
              type="text"
              placeholder="Enter text…"
              value={text}
              onChange={(e) => setValue(f.id, e.target.value)}
            />
            {overflowing ? (
              <span className="hint" style={{ display: "block" }}>
                Too long even at {MIN_FONT_SIZE_IN}″ — will be truncated on print.
              </span>
            ) : shrunk ? (
              <span className="hint" style={{ display: "block" }}>
                Auto-sized to {resolved.size.toFixed(2)}″ to fit.
              </span>
            ) : null}
          </label>
        );
      })}

      {codeField && (
        <>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={data.printCode}
              onChange={(e) => onChange({ ...data, printCode: e.target.checked })}
            />
            Print code
          </label>
          {data.printCode &&
            (codeMode === "field" ? (
              <p className="hint">
                This {codeNoun} mirrors the "{codeField.qrSourceField}" field — nothing to enter here.
              </p>
            ) : (
              <label className="field">
                <span>Code (optional — leave blank to auto-generate)</span>
                <input
                  type="text"
                  placeholder={codeMode === "uuid" ? "e.g. 8f14e45f-…-…-…-…" : "7 hex characters"}
                  value={data.code ?? ""}
                  onChange={(e) => onChange({ ...data, code: e.target.value })}
                />
                {codeError && (
                  <span className="hint error" style={{ display: "block" }}>
                    {codeError}
                  </span>
                )}
              </label>
            ))}
        </>
      )}

      <label className="field">
        <span>Number of copies</span>
        <input
          type="number"
          min={1}
          max={1000}
          value={data.count}
          onChange={(e) => onChange({ ...data, count: parseInt(e.target.value, 10) || 1 })}
        />
      </label>
    </div>
  );
}
