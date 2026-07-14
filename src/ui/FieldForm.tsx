import { getTemplate } from "../labels/templates";
import { MIN_FONT_SIZE_IN, resolveField } from "../labels/resolve";
import type { LabelData } from "../labels/types";

// Field entry for a single label: text lines + QR toggle + copy count.
// The QR mode selector is exposed per template's QR field (uuid vs field).
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
  // payload — all share the same content resolution (uuid vs field) and on/off
  // toggle. Mirror fields (mirrorPayloadOf) just copy it, so they're not the
  // one whose content the form controls.
  const codeField = template.fields.find(
    (f) => (f.kind === "qr" || f.kind === "barcode" || f.kind === "pdf417") && !f.mirrorPayloadOf,
  );
  const codeNoun = codeField?.kind === "qr" ? "QR code" : "barcode";

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
              checked={data.qr}
              onChange={(e) => onChange({ ...data, qr: e.target.checked })}
            />
            Generate {codeNoun}
          </label>
          {data.qr && (
            <>
              <label className="field">
                <span>{codeNoun} content</span>
                <select
                  value={data.qrMode ?? codeField.qrMode ?? "uuid"}
                  onChange={(e) =>
                    onChange({ ...data, qrMode: e.target.value as "uuid" | "field" | "shortId" })
                  }
                >
                  <option value="uuid">Random UUID (unique per label)</option>
                  <option value="shortId">Short ID (7 chars, unique per label)</option>
                  <option value="field">From a field</option>
                </select>
              </label>
              {(data.qrMode ?? codeField.qrMode) === "field" && (
                <label className="field">
                  <span>{codeNoun} source field</span>
                  <select
                    value={data.qrSourceField ?? codeField.qrSourceField ?? textFields[0]?.id ?? ""}
                    onChange={(e) => onChange({ ...data, qrSourceField: e.target.value })}
                  >
                    {textFields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label ?? f.id}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
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
