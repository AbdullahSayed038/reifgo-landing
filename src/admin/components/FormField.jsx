// Label + control wrapper. `type` picks the control: text (default), number,
// url, date, datetime-local, textarea, select (pass `options`), checkbox.
export default function FormField({
  label,
  hint,
  type = "text",
  options,
  value,
  onChange,
  required,
  placeholder,
  span,
}) {
  const cls = span ? `adm-field adm-field--span${span}` : "adm-field";

  if (type === "checkbox") {
    return (
      <label className={`${cls} adm-field--checkbox`}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{label}</span>
      </label>
    );
  }

  return (
    <label className={cls}>
      <span className="adm-field__label">
        {label}
        {required && <em>*</em>}
      </span>
      {type === "textarea" ? (
        <textarea
          value={value ?? ""}
          rows={4}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : type === "select" ? (
        <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && <span className="adm-field__hint">{hint}</span>}
    </label>
  );
}
