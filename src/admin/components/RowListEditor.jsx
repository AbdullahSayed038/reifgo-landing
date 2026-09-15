import { useDragReorder, moveItem } from "../useDragReorder.js";

/**
 * A repeatable list of rows, for the property-page sections added in Syed's
 * August round — unit types, amenities, nearby places and FAQs (Figma 722:57).
 *
 * All four are the same shape of edit: a handful of fields per row, add and
 * remove, and an order that matters. One driver keeps them behaving alike
 * rather than four near-identical blocks drifting apart in PropertyForm.
 *
 * Order is the array's own order — rows are dragged by their grip, or moved
 * with the arrows from the keyboard — rather than a display_order field, so the
 * number never has to be edited by hand. The caller writes display_order from
 * the index when it builds the payload.
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
  // { [rowIndex]: { [columnKey]: "what to fix" } }
  errors = {},
  name,
}) {
  // `key` may be an object to set several fields at once (used by custom cells).
  const update = (index, key, value) =>
    onChange(
      rows.map((row, i) =>
        i === index ? { ...row, ...(typeof key === "object" ? key : { [key]: value }) } : row,
      ),
    );

  const add = () => onChange([...rows, { ...blank }]);

  const remove = (index) => onChange(rows.filter((_, i) => i !== index));

  const drag = useDragReorder((from, to) => onChange(moveItem(rows, from, to)));

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <section className={`adm-panel${Object.keys(errors).length ? " adm-panel--error" : ""}`} data-field={name}>
      <header className="adm-panel__head">
        <div>
          <h2>{title}</h2>
          {hint && <p className="adm-panel__note">{hint}</p>}
          {rows.length > 1 && (
            <p className="adm-panel__note">Drag a row by its handle to change the order on the app.</p>
          )}
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
            <li
              key={i}
              {...drag.rowProps(i)}
              className={`adm-repeater__row ${drag.rowClass(i)}`.trim()}
            >
              <span className="adm-repeater__grip adm-rowgrip" title="Drag to reorder" {...drag.handleProps(i)}>
                ⋮⋮
              </span>
              <div className="adm-rowfields">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className={`adm-rowfield${errors[i]?.[col.key] ? " adm-rowfield--error" : ""}`}
                    style={{ flex: col.flex ?? 1, minWidth: col.minWidth ?? 120 }}
                  >
                    <span className="adm-rowfield__label">{col.label}</span>
                    {col.render ? (
                      col.render(row, (key, value) => update(i, key, value), i)
                    ) : col.options ? (
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
                    {errors[i]?.[col.key] && (
                      <span className="adm-rowfield__error" role="alert">{errors[i][col.key]}</span>
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
