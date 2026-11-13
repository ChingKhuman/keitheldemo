"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";

export default function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const register = mode === "register";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const res = await api(`/api/auth/${mode}`, "POST", {
      name: f.get("name"),
      phone: f.get("phone"),
      password: f.get("password"),
    });
    if (res.ok) {
      window.location.href = next; // full load so the header shows the signed-in state
      return;
    }
    setError(res.error);
    setBusy(false);
  }

  const other = `${register ? "/login" : "/register"}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;
  return (
    <form className="panel form" onSubmit={submit}>
      {register && (
        <label htmlFor="name">
          Your name
          <input id="name" name="name" type="text" maxLength={60} autoComplete="name" required />
        </label>
      )}
      <label htmlFor="phone">
        Mobile number
        <input id="phone" name="phone" type="tel" maxLength={16} autoComplete="tel" placeholder="10-digit mobile number" required />
      </label>
      <label htmlFor="password">
        Password
        <input
          id="password"
          name="password"
          type="password"
          minLength={register ? 8 : 1}
          maxLength={128}
          autoComplete={register ? "new-password" : "current-password"}
          required
        />
      </label>
      {register && <p className="note">Use at least 8 characters.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn primary" type="submit" disabled={busy}>
        {busy ? "Please wait" : register ? "Create account" : "Sign in"}
      </button>
      <p className="note">
        {register ? "Already have an account? " : "New to Keithel? "}
        <Link href={other}>{register ? "Sign in" : "Create an account"}</Link>
      </p>
    </form>
  );
}
