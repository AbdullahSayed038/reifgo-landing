/**
 * An on/off setting with a sentence saying what it does, for flags that
 * change what the app shows (a bare checkbox read as a form answer).
 */
export default function Switch({ label, description, checked, onChange, disabled = false }) {
  return (
    <label className={`adm-switch${disabled ? " is-disabled" : ""}`}>
      <span className="adm-switch__text">
        <strong>{label}</strong>
        {description && <span>{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="adm-switch__input"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="adm-switch__track" aria-hidden="true">
        <span className="adm-switch__thumb" />
      </span>
    </label>
  );
}
