import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import PasswordInput from "../components/PasswordInput.jsx";

// Where the emailed link lands: /admin/reset-password?token=…
export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) return setError("Use at least 8 characters");
    if (password !== confirm) return setError("The two passwords don't match");
    setBusy(true);
    setError("");
    try {
      await api.post("/admin/auth/reset-password", { token, password });
      setDone(true);
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
    setBusy(false);
  };

  return (
    <div className="adm-login">
      <form className="adm-login__card" onSubmit={submit}>
        <span className="adm-login__logo">REIFGO</span>
        <h1>Choose a new password</h1>
        {!token ? (
          <>
            <p>This link is missing its code. Open the link from the email again, or ask for a new one.</p>
            <Link className="adm-login__link" to="/admin/forgot-password">Send a new link</Link>
          </>
        ) : done ? (
          <>
            <p className="adm-login__ok">Your password has been changed. You can sign in with it now.</p>
            <Link className="adm-btn adm-btn--primary" to="/admin/login">Go to sign in</Link>
          </>
        ) : (
          <>
            <p>At least 8 characters.</p>
            <PasswordInput
              autoFocus
              autoComplete="new-password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordInput
              autoComplete="new-password"
              placeholder="Type it again"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {error && <span className="adm-login__error">{error}</span>}
            <button className="adm-btn adm-btn--primary" disabled={busy}>
              {busy ? "Saving…" : "Set new password"}
            </button>
            {error && /expired|used/i.test(error) && (
              <Link className="adm-login__link" to="/admin/forgot-password">Send a new link</Link>
            )}
          </>
        )}
      </form>
    </div>
  );
}
