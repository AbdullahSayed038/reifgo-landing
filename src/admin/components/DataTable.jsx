import { useMemo, useState } from "react";

// columns: [{ key, label, render?(row), width? }]
// searchKeys: row fields (dot paths allowed) matched by the search box.
export default function DataTable({
  columns,
  rows,
  searchKeys = [],
  searchPlaceholder = "Search…",
  emptyText = "Nothing here yet.",
  toolbar,
  onRowClick,
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
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className={onRowClick ? "adm-table__row--link" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
