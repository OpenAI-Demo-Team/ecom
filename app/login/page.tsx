"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DEMO_ACCOUNTS = [
  { label: "Creator", email: "jack@devspace.demo", password: "demo123" },
  { label: "Designer", email: "mira@devspace.demo", password: "demo123" },
  { label: "Admin", email: "admin@devspace.demo", password: "admin123" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData();
    form.set("email", email);
    form.set("password", password);
    form.set("next", "/feed");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: form,
        redirect: "follow",
      });

      if (res.redirected) {
        const url = new URL(res.url);
        if (url.searchParams.get("error") === "invalid") {
          setError("Invalid email or password. Try a demo account below.");
          setLoading(false);
        } else {
          router.push("/feed");
        }
        return;
      }

      router.push("/feed");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const fillDemo = (account: typeof DEMO_ACCOUNTS[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError("");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">DS</span>
          <h1>Sign in to DevSpace</h1>
          <p className="subtitle">Welcome back. Enter your credentials to continue.</p>
        </div>

        {error && (
          <div className="alert-banner error">
            <span>&#9888;&#65039;</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account? <Link href="/signup">Sign up</Link>
        </div>

        <div className="demo-accounts">
          <p className="demo-accounts-title">Demo accounts</p>
          <div className="demo-accounts-grid">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                className="demo-account-btn"
                type="button"
                onClick={() => fillDemo(a)}
              >
                <span className="demo-account-label">{a.label}</span>
                <span className="demo-account-email">{a.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
