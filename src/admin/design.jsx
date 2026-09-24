import { createContext, useContext, useMemo, useState } from "react";

// Syed, Sept 24: the reworked pages (V2) sit behind a switch above the account
// name, so the current design (V1) is never lost. Remembered per browser.
const STORAGE_KEY = "reifgo_admin_design";
export const DESIGNS = ["v1", "v2"];
const DEFAULT = "v2";

const read = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return DESIGNS.includes(v) ? v : DEFAULT;
  } catch {
    return DEFAULT;
  }
};

const DesignContext = createContext({ design: DEFAULT, setDesign: () => {} });

export function DesignProvider({ children }) {
  const [design, setDesignState] = useState(read);
  const value = useMemo(
    () => ({
      design,
      setDesign: (next) => {
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          /* private mode: lasts for this visit */
        }
        setDesignState(next);
      },
    }),
    [design],
  );
  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>;
}

export const useDesign = () => useContext(DesignContext);

/** Renders the V1 or V2 version of a page. */
export function Versioned({ v1, v2 }) {
  const { design } = useDesign();
  return design === "v1" ? v1 : v2;
}

/** The sidebar switch: "Design  V1 | V2". */
export function DesignSwitch() {
  const { design, setDesign } = useDesign();
  return (
    <div className="adm-design-switch" title="V2 is the reworked Leads and Dashboard. V1 is the previous design, kept as it was.">
      <span className="adm-design-switch__label">Design</span>
      <div className="adm-design-switch__seg" role="radiogroup" aria-label="Design version">
        {DESIGNS.map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={design === d}
            className={design === d ? "is-active" : ""}
            onClick={() => setDesign(d)}
          >
            {d.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
