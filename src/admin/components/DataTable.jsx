import { Fragment, useMemo, useState } from "react";

// columns: [{ key, label, render?(row), width? }]
// searchKeys: row fields (dot paths allowed) matched by the search box.
// groupBy: (row) => string | null — renders a labelled band per group instead
//   of one flat list. Rows returning null fall into `ungroupedLabel`, which is
//   how REIFGO's own entries stay together rather than being filed under a
//   developer they do not belong to.
export default function DataTable({
  columns,
  rows,
  searchKeys = [],
  searchPlaceholder = "Search…",
  emptyText = "Nothing here yet.",
  toolbar,
  onRowClick,
  groupBy,
  ungroupedLabel = "REIFGO",
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    const read = (row, path) =>
      path.split(".").reduce((v, k) => (v == null ? v : v[k]), row);
    return rows.filter((row) =>
      searchKeys.some((key) =>
        String(read(row, key) ?? "").toLowerCase().includes(q),
      ),
    );
  }, [rows, query, searchKeys]);

  // Groups keep first-appearance order, so the table does not reshuffle when a
  // row's status changes. The ungrouped band is forced last.
  const groups = useMemo(() => {
    if (!groupBy) return null;
    const map = new Map();
    for (const row of filtered) {
      const key = groupBy(row) || ungroupedLabel;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    const entries = [...map.entries()];
    const own = entries.filter(([k]) => k === ungroupedLabel);
    const rest = entries.filter(([k]) => k !== ungroupedLabel);
    return [...rest, ...own];
  }, [filtered, groupBy, ungroupedLabel]);

  const renderRow = (row) => (
    <tr
      key={row.id}
      className={onRowClick ? "adm-table__row--link" : undefined}
      onClick={onRowClick ? () => onRowClick(row) : undefined}
    >
      {columns.map((c) => (
        <td key={c.key} data-label={c.label}>
          {c.render ? c.render(row) : row[c.key]}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="adm-table-wrap">
      <div className="adm-table-toolbar">
        {searchKeys.length > 0 && (
          <input
            className="adm-search"
            type="search"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
        <div className="adm-table-toolbar__actions">{toolbar}</div>
      </div>

      <div className="adm-table-scroll">
        <table className="adm-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={c.width ? { width: c.width } : undefined}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="adm-table__empty" colSpan={columns.length}>
                  {emptyText}
                </td>
              </tr>
            ) : groups ? (
              groups.map(([label, groupRows]) => (
                <Fragment key={label}>
                  <tr className="adm-table__group">
                    <th scope="colgroup" colSpan={columns.length}>
                      {label}
                      <span className="adm-table__group-count">{groupRows.length}</span>
                    </th>
                  </tr>
                  {groupRows.map(renderRow)}
                </Fragment>
              ))
            ) : (
              filtered.map(renderRow)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
