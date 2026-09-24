import { useEffect, useState } from "react";
import { api, PERMISSIONS, permissionTitle, updateSessionName } from "../api.js";
import FormField from "../components/FormField.jsx";
import { useToast } from "../components/Toast.jsx";
import { fmtDate } from "../contentUtils.js";
import { timeAgo } from "../leadUtils.js";
import { COMMON_CURRENCIES, currencyName, ORIGINAL, useCurrency } from "../currency.jsx";

// Account settings: reached by clicking your name in the sidebar.
export default function Account() {
  const [me, setMe] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", position: "" });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { currency, setCurrency, available, ratesUpdatedAt } = useCurrency();
  const common = COMMON_CURRENCIES.filter((c) => available.includes(c));
  const others = available.filter((c) => !COMMON_CURRENCIES.includes(c));

  const load = () =>
    api
      .get("/admin/me")
      .then((m) => {
        setMe(m);
        setForm({ name: m.name ?? "", phone: m.phone ?? "", position: m.position ?? "" });
      })
      .catch((e) => toast.error(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setP = (k) => (v) => setPw((f) => ({ ...f, [k]: v }));
  const editable = me?.editable ?? [];

  const saveDetails = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const body = {};
      for (const k of editable) body[k] = form[k];
      const updated = await api.patch("/admin/me", body);
      setMe(updated);
      updateSessionName(updated.name);
      toast.success("Details saved");
    } catch (err) {
      toast.error(err.message);
    }
    setBusy(false);
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (pw.next.length < 8) return toast.error("A new password needs at least 8 characters");
    if (pw.next !== pw.confirm) return toast.error("The two new passwords don't match");
    setBusy(true);
    try {
      await api.post("/admin/me/password", { current_password: pw.current, new_password: pw.next });
      setPw({ current: "", next: "", confirm: "" });
      toast.success("Password changed");
    } catch (err) {
      toast.error(err.message);
    }
    setBusy(false);
  };

  if (!me) {
    return (
      <>
        <header className="adm-page-head"><div><h1>Account</h1></div></header>
        <p className="adm-panel__empty">Loading…</p>
      </>
    );
  }

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Account</h1>
          <p>Your sign-in details{me.developer_name ? ` at ${me.developer_name}` : ""}.</p>
        </div>
      </header>

      <form className="adm-form" onSubmit={saveDetails}>
        <section className="adm-panel">
          <header className="adm-panel__head"><h2>Details</h2></header>
          <div className="adm-form-grid">
            {editable.includes("name") ? (
              <FormField label="Name" required value={form.name} onChange={set("name")} />
            ) : (
              <label className="adm-field">
                <span className="adm-field__label">Name</span>
                <input value={me.name ?? ""} disabled readOnly />
                {me.kind === "developer" && (
                  <span className="adm-field__hint">Change the company name on the Company Profile.</span>
                )}
              </label>
            )}
            <label className="adm-field">
              <span className="adm-field__label">Email</span>
              <input value={me.email ?? "—"} disabled readOnly />
              <span className="adm-field__hint">Your sign-in address. Only a REIFGO admin can change it.</span>
            </label>
            {editable.includes("phone") && (
              <FormField label="Contact number" value={form.phone} onChange={set("phone")} />
            )}
            {editable.includes("position") && (
              <FormField label="Position" value={form.position} onChange={set("position")} />
            )}
            {me.created_at && (
              <label className="adm-field">
                <span className="adm-field__label">Account created</span>
                <input value={fmtDate(me.created_at)} disabled readOnly />
              </label>
            )}
          </div>
          {me.kind === "team" && (
            <div style={{ marginTop: 16 }}>
              <span className="adm-field__label">Access: {permissionTitle(me.permissions)}</span>
              <ul className="adm-tl__meta" style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                <li>Work the leads assigned to you</li>
                {PERMISSIONS.filter((p) => me.permissions.includes(p.key)).map((p) => (
                  <li key={p.key}>{p.label}</li>
                ))}
              </ul>
            </div>
          )}
          {editable.length > 0 && (
            <footer className="adm-form-actions" style={{ marginTop: 16 }}>
              <button className="adm-btn adm-btn--primary" disabled={busy}>
                {busy ? "Saving…" : "Save details"}
              </button>
            </footer>
          )}
        </section>
      </form>

      <section className="adm-panel">
        <header className="adm-panel__head">
          <div>
            <h2>Display currency</h2>
            <p className="adm-panel__note">
              How prices show for you in the CMS. It doesn't change any listing's price.
            </p>
          </div>
        </header>
        <div className="adm-form-grid">
          <label className="adm-field">
            <span className="adm-field__label">Show prices in</span>
            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                toast.success(
                  e.target.value === ORIGINAL
                    ? "Prices now show in each listing's own currency"
                    : `Prices now show in ${currencyName(e.target.value)}`,
                );
              }}
            >
              <option value={ORIGINAL}>Each listing's own currency</option>
              <optgroup label="Convert to">
                {common.map((c) => <option key={c} value={c}>{c} · {currencyName(c)}</option>)}
              </optgroup>
              {others.length > 0 && (
                <optgroup label="All currencies">
                  {others.map((c) => <option key={c} value={c}>{c} · {currencyName(c)}</option>)}
                </optgroup>
              )}
            </select>
            <span className="adm-field__hint">
              {currency === ORIGINAL
                ? "Each listing is priced in its country's currency, e.g. AED in the UAE and GBP in the UK."
                : `Other currencies are converted at today's rate and marked ≈${ratesUpdatedAt ? ` (rates updated ${timeAgo(ratesUpdatedAt)})` : ""}.`}
            </span>
          </label>
        </div>
      </section>

      {me.can_change_password ? (
        <form className="adm-form" onSubmit={savePassword}>
          <section className="adm-panel">
            <header className="adm-panel__head"><h2>Password</h2></header>
            <div className="adm-form-grid">
              <FormField label="Current password" type="password" value={pw.current} onChange={setP("current")} span={2} />
              <FormField label="New password" type="password" value={pw.next} onChange={setP("next")} hint="At least 8 characters." />
              <FormField label="New password again" type="password" value={pw.confirm} onChange={setP("confirm")} />
            </div>
            <footer className="adm-form-actions" style={{ marginTop: 16 }}>
              <button className="adm-btn adm-btn--primary" disabled={busy || !pw.current || !pw.next}>
                Change password
              </button>
            </footer>
          </section>
        </form>
      ) : (
        <p className="adm-note">This is the shared owner login. Its password is set on the server.</p>
      )}
    </>
  );
}
