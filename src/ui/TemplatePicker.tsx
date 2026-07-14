import { TEMPLATES } from "../labels/templates";

export function TemplatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="field">
      <span>Label type</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {TEMPLATES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.widthIn}″ × {t.heightIn}″)
          </option>
        ))}
      </select>
    </label>
  );
}
