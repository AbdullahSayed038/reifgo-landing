// Small hand-rolled SVG charts for the dashboard. Marks are thin with
// rounded data-ends, 2px surface gaps between fills, and text stays in ink
// tokens (identity comes from the color chip + label, never colored text).

const INK = "#24313a";
const MUTED = "#6b7a84";

// ---- Donut (part-of-whole, e.g. properties by status) ----

export function DonutChart({ data, centerLabel }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 52;
  const STROKE = 16;
  const C = 2 * Math.PI * R;
  const GAP_DEG = 3; // angular gap so segments never touch

  let angle = -90;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const sweep = (d.value / total) * 360;
      const seg = { ...d, start: angle, sweep };
      angle += sweep;
      return seg;
    });

  const arc = (startDeg, sweepDeg) => {
    const pad = segments.length > 1 ? GAP_DEG / 2 : 0;
    const a0 = ((startDeg + pad) * Math.PI) / 180;
    const a1 = ((startDeg + sweepDeg - pad) * Math.PI) / 180;
    const large = sweepDeg - pad * 2 > 180 ? 1 : 0;
    const x0 = 70 + R * Math.cos(a0);
    const y0 = 70 + R * Math.sin(a0);
    const x1 = 70 + R * Math.cos(a1);
    const y1 = 70 + R * Math.sin(a1);
    return `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}`;
  };

  return (
    <div className="adm-chart-donut">
      <svg viewBox="0 0 140 140" role="img" aria-label={centerLabel}>
        {segments.map((s) =>
          // One status holding everything is a full ring: an arc that starts
          // and ends on the same point draws nothing but its rounded cap.
          s.sweep >= 359.9 ? (
            <circle key={s.label} cx="70" cy="70" r={R} fill="none" stroke={s.color} strokeWidth={STROKE}>
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          ) : (
          <path
            key={s.label}
            d={arc(s.start, s.sweep)}
            fill="none"
            stroke={s.color}
            strokeWidth={STROKE}
            strokeLinecap="round"
          >
            <title>{`${s.label}: ${s.value}`}</title>
          </path>
          ),
        )}
        {total === 0 && (
          <circle cx="70" cy="70" r={R} fill="none" stroke="#e3e8ea" strokeWidth={STROKE} />
        )}
        <text x="70" y="66" textAnchor="middle" fontSize="24" fontWeight="800" fill={INK}>
          {total}
        </text>
        <text x="70" y="84" textAnchor="middle" fontSize="9" fontWeight="700" fill={MUTED} letterSpacing="0.06em">
          {centerLabel.toUpperCase()}
        </text>
      </svg>
      <ul className="adm-chart-legend">
        {data.map((d) => (
          <li key={d.label}>
            <span className="adm-chart-chip" style={{ background: d.color }} />
            <span className="adm-chart-legend__label">{d.label}</span>
            <strong>{d.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---- Horizontal bars (magnitude per category) ----

const ROW_H = 34;
const BAR_H = 14;
const CHART_W = 320;
const VALUE_W = 34;

// Rounded on the data end only; flat at the baseline.
const barPath = (w) => {
  const width = Math.max(w, 4);
  const r = 4;
  return `M 0 0 H ${width - r} A ${r} ${r} 0 0 1 ${width} ${r} V ${BAR_H - r} A ${r} ${r} 0 0 1 ${width - r} ${BAR_H} H 0 Z`;
};

export function BarChart({ data, color, valueFormat }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const trackW = CHART_W - VALUE_W;
  const fmt = valueFormat ?? ((v) => v);

  return (
    <svg
      className="adm-chart-bars"
      viewBox={`0 0 ${CHART_W} ${data.length * ROW_H}`}
      role="img"
      aria-label="Bar chart"
    >
      {data.map((d, i) => {
        const w = (d.value / max) * trackW;
        const y = i * ROW_H;
        return (
          <g key={d.label} transform={`translate(0 ${y})`}>
            <title>{`${d.label}: ${fmt(d.value)}`}</title>
            <text x="0" y="11" fontSize="10.5" fontWeight="600" fill={MUTED}>
              {d.label.length > 38 ? `${d.label.slice(0, 37)}…` : d.label}
            </text>
            <g transform="translate(0 16)">
              <path d={barPath(w)} fill={d.color ?? color} />
              <text
                x={w + 7}
                y={BAR_H / 2 + 3.5}
                fontSize="10.5"
                fontWeight="700"
                fill={INK}
              >
                {fmt(d.value)}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

// ---- Columns over time (e.g. leads received per day) ----

/**
 * data: [{ label, value, title }]. Labels are thinned out so they never
 * collide; every column still has its own tooltip.
 */
export function ColumnChart({ data, color = "#00556c", height = 150 }) {
  const W = 1000;
  const H = height;
  const AXIS = 18;
  const TOP = 14;
  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = W / Math.max(data.length, 1);
  const barW = Math.max(3, Math.min(28, slot * 0.62));
  const every = Math.ceil(data.length / 10);

  const colPath = (x, h) => {
    const r = Math.min(3, barW / 2, h);
    const y = H - AXIS - h;
    return `M ${x} ${H - AXIS} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} H ${x + barW - r} A ${r} ${r} 0 0 1 ${x + barW} ${y + r} V ${H - AXIS} Z`;
  };

  return (
    <svg className="adm-chart-columns" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Column chart">
      <line x1="0" x2={W} y1={H - AXIS + 0.5} y2={H - AXIS + 0.5} stroke="#e3e8ea" />
      {data.map((d, i) => {
        const h = d.value ? Math.max(2, (d.value / max) * (H - AXIS - TOP)) : 0;
        const x = i * slot + (slot - barW) / 2;
        return (
          <g key={i}>
            <title>{d.title ?? `${d.label}: ${d.value}`}</title>
            {/* A full-height hit area so thin columns are easy to hover. */}
            <rect x={i * slot} y="0" width={slot} height={H - AXIS} fill="transparent" />
            {h > 0 && <path d={colPath(x, h)} fill={color} />}
            {d.value > 0 && data.length <= 31 && (
              <text x={x + barW / 2} y={H - AXIS - h - 4} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={INK}>
                {d.value}
              </text>
            )}
            {i % every === 0 && (
              <text x={x + barW / 2} y={H - 5} textAnchor="middle" fontSize="9.5" fill={MUTED}>
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
