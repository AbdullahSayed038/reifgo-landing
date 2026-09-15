import { Fragment, useMemo, useState } from "react";

// columns: [{ key, label, render?(row), width?, sortValue?(row), sortable? }]
//   Every column with a label sorts: click the header for low → high, again for
//   high → low, a third time to go back to the page's own order. sortValue says
//   what to compare when the cell is rendered from something other than
//   row[key]; set sortable: false to opt a column out.
// searchKeys: row fields (dot paths allowed) matched by the search box.
// groupBy: (row) => string | null — renders a labelled band per group instead
//   of one flat list. Rows returning null fall into `ungroupedLabel`, which is
//   how REIFGO's own entries stay together rather than being filed under a
//   developer they do not belong to. Sorting applies inside each group.
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
  const [sort, setSort] = useState(null); // { key, dir: "asc" | "desc" }

  const isSortable = (c) => c.sortable ?? Boolean(c.label);

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

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const valueOf = (row) => {
      let v = col.sortValue ? col.sortValue(row) : row[col.key];
      if (v && typeof v === "object" && !(v instanceof Date)) v = v.name ?? v.label ?? null;
      if (typeof v === "boolean") v = v ? 1 : 0;
      return v === "" ? null : v;
    };
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      // Blanks always sink to the bottom, whichever way the column runs.
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" }) * dir;
    });
  }, [filtered, sort, columns]);

  const cycleSort = (key) =>
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return null;
    });

  // Groups keep first-appearance order, so the table does not reshuffle when a
  // row's status changes. The ungrouped band is forced last.
  const groups = useMemo(() => {
    if (!groupBy) return null;
    const map = new Map();
    for (const row of sorted) {
      const key = groupBy(row) || ungroupedLabel;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    const entries = [...map.entries()];
    const own = entries.filter(([k]) => k === ungroupedLabel);
    const rest = entries.filter(([k]) => k !== ungroupedLabel);
    return [...rest, ...own];
  }, [sorted, groupBy, ungroupedLabel]);

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

  const sortLabel = sort ? columns.find((c) => c.key === sort.key)?.label : null;

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
        <div className="adm-table-toolbar__actions">
          {toolbar}
          {sort && (
            <button
              type="button"
              className="adm-btn adm-btn--ghost adm-btn--sm adm-sort-reset"
              onClick={() => setSort(null)}
              title="Back to the default order"
            >
              ↺ Reset sort
              <span className="adm-sort-reset__what">
                {sortLabel} {sort.dir === "asc" ? "↑" : "↓"}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="adm-table-scroll">
        <table className="adm-table">
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    style={c.width ? { width: c.width } : undefined}
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                  >
                    {isSortable(c) ? (
                      <button
                        type="button"
                        className={`adm-th-sort${active ? " is-active" : ""}`}
                        onClick={() => cycleSort(c.key)}
                        title={
                          !active
                            ? "Sort low to high"
                            : sort.dir === "asc"
                              ? "Sort high to low"
                              : "Back to the default order"
                        }
                      >
                        {c.label}
                        <span className="adm-th-sort__arrow" aria-hidden="true">
                          {active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
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
              sorted.map(renderRow)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
