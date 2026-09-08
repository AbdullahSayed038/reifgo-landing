/**
 * A repeatable list of rows, for the property-page sections added in Syed's
 * August round — unit types, amenities, nearby places and FAQs (Figma 722:57).
 *
 * All four are the same shape of edit: a handful of fields per row, add and
 * remove, and an order that matters. One driver keeps them behaving alike
 * rather than four near-identical blocks drifting apart in PropertyForm.
 *
 * Order is the array's own order — rows move with the arrows rather than a
 * display_order field, so the number never has to be edited by hand. The
 * caller writes display_order from the index when it builds the payload.
 */
export default function RowListEditor({
  title,
  hint,
  emptyText,
  rows,
  onChange,
  blank,
  columns,
  addLabel = "+ Add row",
}) {
  const update = (index, key, value) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  const add = () => onChange([...rows, { ...blank }]);

  const remove = (index) => onChange(rows.filter((_, i) => i !== index));

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <section className="adm-panel">
      <header className="adm-panel__head">
        <div>
          <h2>{title}</h2>
          {hint && <p className="adm-panel__note">{hint}</p>}
        </div>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={add}>
          {addLabel}
        </button>
      </header>

      {rows.length === 0 ? (
        <p className="adm-panel__empty">{emptyText}</p>
      ) : (
        <ul className="adm-repeater">
          {rows.map((row, i) => (
            <li key={i} className="adm-repeater__row">
              <div className="adm-rowfields">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="adm-rowfield"
                    style={{ flex: col.flex ?? 1, minWidth: col.minWidth ?? 120 }}
                  >
                    <span className="adm-rowfield__label">{col.label}</span>
                    {col.options ? (
                      <select
                        value={row[col.key] ?? ""}
                        onChange={(e) => update(i, col.key, e.target.value)}
                      >
                        {col.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : col.multiline ? (
                      <textarea
                        rows={3}
                        value={row[col.key] ?? ""}
                        placeholder={col.placeholder}
                        onChange={(e) => update(i, col.key, e.target.value)}
                      />
                    ) : (
                      <input
                        type={col.type ?? "text"}
                        value={row[col.key] ?? ""}
                        placeholder={col.placeholder}
                        onChange={(e) => update(i, col.key, e.target.value)}
                      />
                    )}
                  </label>
                ))}
              </div>

              <div className="adm-rowactions">
                <button
                  type="button"
                  className="adm-iconbtn"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="adm-iconbtn"
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  aria-label="Move down"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="adm-iconbtn adm-iconbtn--danger"
                  onClick={() => remove(i)}
                  aria-label="Remove row"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
