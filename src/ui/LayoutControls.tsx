import { getTemplate } from "../labels/templates";
import type { LabelData, LayoutOverride, ZplFont } from "../labels/types";

// Light layout editor: nudge x/y/size/font per field on top of template defaults.

const FONTS: ZplFont[] = ["0", "A", "B", "C", "D", "E", "F", "G", "H"];

export function LayoutControls({
  data,
  onChange,
}: {
  data: LabelData;
  onChange: (next: LabelData) => void;
}) {
  const template = getTemplate(data.templateId);

  function update(fieldId: string, patch: Partial<LayoutOverride>) {
    const prev = data.overrides[fieldId] ?? {};
    onChange({
      ...data,
      overrides: { ...data.overrides, [fieldId]: { ...prev, ...patch } },
    });
  }

  return (
    <div>
      <p className="hint">Nudge position (inches), text size (inches), and font per field.</p>
      {template.fields.map((f) => {
        const o = data.overrides[f.id] ?? {};
        const label = f.label ?? f.id;
        return (
          <div key={f.id} style={{ marginBottom: "0.75rem" }}>
            <strong style={{ fontSize: "0.82rem" }}>{label}</strong>
            <div className="layout-controls-grid">
              <label className="field">
                <span>x</span>
                <input
                  type="number"
                  step={0.01}
                  value={o.x ?? f.x}
                  onChange={(e) => update(f.id, { x: parseFloat(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>y</span>
                <input
                  type="number"
                  step={0.01}
                  value={o.y ?? f.y}
                  onChange={(e) => update(f.id, { y: parseFloat(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>{f.kind === "qr" ? "magnification" : "size"}</span>
                <input
                  type="number"
                  step={f.kind === "qr" ? 1 : 0.01}
                  value={o.size ?? f.size}
                  onChange={(e) => update(f.id, { size: parseFloat(e.target.value) })}
                />
              </label>
              {f.kind !== "qr" && (
                <label className="field">
                  <span>font</span>
                  <select
                    value={o.font ?? f.font ?? "0"}
                    onChange={(e) => update(f.id, { font: e.target.value as ZplFont })}
                  >
                    {FONTS.map((ft) => (
                      <option key={ft} value={ft}>
                        {ft}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
