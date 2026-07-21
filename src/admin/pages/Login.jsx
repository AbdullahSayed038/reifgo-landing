import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getSession, IS_DEMO, login } from "../api.js";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (getSession()) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!username || !password || busy) return;
    setBusy(true);
    setError("");
    try {
      await login(username, password);
      navigate("/admin");
    } catch (err) {
      setError(err.message || "Login failed");
      setBusy(false);
    }
  };

  return (
    <div className="adm-login">
      <form className="adm-login__card" onSubmit={submit}>
        <span className="adm-login__logo">REIFGO</span>
        <h1>Admin Dashboard</h1>
        <p>Sign in to manage app content.</p>
        <input
          type="text"
          autoFocus
          autoCapitalize="none"
          autoComplete="username"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <span className="adm-login__error">{error}</span>}
        <button className="adm-btn adm-btn--primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {IS_DEMO && (
          <div className="adm-login__demo">
            <span>Demo accounts (password 123)</span>
            <div>
              <button type="button" onClick={() => setUsername("admin")}>admin</button>
              <button type="button" onClick={() => setUsername("emaar")}>emaar (developer)</button>
              <button type="button" onClick={() => setUsername("omar")}>omar (broker)</button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
