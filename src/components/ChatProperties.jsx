import "./ChatProperties.css";

// Renders the property matches the assistant's search_properties tool returned,
// as compact cards under its text reply. Purely presentational — the backend
// already pulled these straight from the shared database.

function formatAed(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `AED ${value.toLocaleString("en-US")}`;
}

function formatPct(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `${value % 1 === 0 ? value : value.toFixed(1)}%`;
}

export default function ChatProperties({ properties }) {
  if (!properties?.length) return null;

  return (
    <ul className="chatprops">
      {properties.map((p) => {
        const price = formatAed(p.price);
        const yld = formatPct(p.rentalYield);
        return (
          <li className="chatprops__card" key={p.id}>
            <div
              className="chatprops__media"
              style={p.imageUrl ? { backgroundImage: `url(${p.imageUrl})` } : undefined}
            />
            <div className="chatprops__body">
              <p className="chatprops__name">{p.name}</p>
              {p.location ? <p className="chatprops__loc">{p.location}</p> : null}
              <div className="chatprops__stats">
                {price ? <span className="chatprops__price">{price}</span> : null}
                {yld ? <span className="chatprops__yield">{yld} yield</span> : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
