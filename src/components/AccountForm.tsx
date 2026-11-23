"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Account = { email: string; role: "user" | "admin" };

function safeNextPath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return "";
  const url = new URL(path, window.location.origin);
  return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : "";
}

export default function AccountForm({ nextPath }: { nextPath: string }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setAccount(data);
      })
      .catch(() => {});
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not sign in. Please try again.");
        return;
      }
      const target = safeNextPath(nextPath) || (body.role === "admin" ? "/admin" : "/cart");
      window.location.assign(target);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth", { method: "DELETE" });
    setAccount(null);
  }

  if (account) {
    return (
      <section className="account-panel">
        <p className="kicker">YOUR ACCOUNT</p>
        <h1>Welcome back</h1>
        <p>Signed in as <strong>{account.email}</strong>.</p>
        <div className="hero-actions">
          <Link className="btn" href={account.role === "admin" ? "/admin" : "/music/tracks"}>
            {account.role === "admin" ? "OPEN ADMIN DASHBOARD" : "BROWSE BEATS"}
          </Link>
          <button className="btn secondary" onClick={signOut}>SIGN OUT</button>
        </div>
      </section>
    );
  }

  return (
    <section className="account-panel">
      <p className="kicker">BEAT STORE</p>
      <h1>{mode === "login" ? "Sign in" : "Create your account"}</h1>
      <p className="muted">Sign in is required before checkout. Your order and download links are tied to your e-mail.</p>
      <div className="account-tabs">
        <button className={mode === "login" ? "selected" : ""} onClick={() => setMode("login")}>SIGN IN</button>
        <button className={mode === "register" ? "selected" : ""} onClick={() => setMode("register")}>CREATE ACCOUNT</button>
      </div>
      <form className="form" onSubmit={submit}>
        <label>
          E-MAIL
          <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          PASSWORD
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "register" ? 10 : 1}
            maxLength={128}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {mode === "register" && <small className="muted">Use at least 10 characters.</small>}
        <button className="btn" disabled={busy}>{busy ? "PLEASE WAIT…" : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}</button>
        {error && <p className="err">{error}</p>}
      </form>
    </section>
  );
}
