import PasswordInput from "./PasswordInput.jsx";

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
  error,
  name,
}) {
  // `error` turns the field red and says what to fix; `name` lets an error
  // summary scroll to it.
  const cls = [
    "adm-field",
    span ? `adm-field--span${span}` : "",
    error ? "adm-field--error" : "",
  ].filter(Boolean).join(" ");

  if (type === "checkbox") {
    return (
      <label className={`${cls} adm-field--checkbox`} data-field={name}>
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
    <label className={cls} data-field={name}>
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
      ) : type === "password" ? (
        <PasswordInput
          value={value}
          placeholder={placeholder}
          autoComplete="new-password"
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
      {error ? (
        <span className="adm-field__error" role="alert">{error}</span>
      ) : (
        hint && <span className="adm-field__hint">{hint}</span>
      )}
    </label>
  );
}
