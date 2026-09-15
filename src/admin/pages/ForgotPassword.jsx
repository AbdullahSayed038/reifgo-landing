import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

// "Forgot password": emails a one-time reset link. The answer is the same
// whether or not the address has an account, so it can't be used to check.
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await api.post("/admin/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
    setBusy(false);
  };

  return (
    <div className="adm-login">
      <form className="adm-login__card" onSubmit={submit}>
        <span className="adm-login__logo">REIFGO</span>
        <h1>Reset your password</h1>
        {sent ? (
          <>
            <p className="adm-login__ok">
              If {email.trim()} belongs to an account, a reset link is on its way. It works once
              and expires in an hour.
            </p>
            <Link className="adm-login__link" to="/admin/login">Back to sign in</Link>
          </>
        ) : (
          <>
            <p>Enter the email address you sign in with and we'll send you a link.</p>
            <input
              type="email"
              autoFocus
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <span className="adm-login__error">{error}</span>}
            <button className="adm-btn adm-btn--primary" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </button>
            <Link className="adm-login__link" to="/admin/login">Back to sign in</Link>
          </>
        )}
      </form>
    </div>
  );
}
