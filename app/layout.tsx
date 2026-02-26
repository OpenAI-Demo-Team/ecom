import "./globals.css";
import type { Metadata } from "next";
import { getCurrentUser } from "../src/backend/auth/server";

export const metadata: Metadata = {
  title: "AgentMarket",
  description: "AI agent marketplace with Codex-powered playground and self-healing infrastructure",
  icons: {
    icon: "/favicon.svg"
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <header className="shell nav">
          <a className="brand" href="/">
            <span className="brand-mark">AM</span>
            <span className="brand-copy">
              AgentMarket
              <small>AI Agent Marketplace</small>
            </span>
          </a>

          <nav className="nav-links">
            <a href="/products">Agents</a>
            <a href="/about">About</a>
            <a href="/playground">Playground</a>
            <a href="/cart">Cart</a>
            <a href="/checkout">Checkout</a>
            {user?.role === "ADMIN" ? <a href="/admin">Ops Console</a> : null}
          </nav>

          <div className="nav-auth">
            {user ? (
              <>
                <span className="session-pill">
                  {user.name} &middot; {user.role}
                </span>
                <form method="post" action="/api/auth/logout">
                  <button type="submit" className="btn ghost nav-logout">
                    Logout
                  </button>
                </form>
              </>
            ) : (
              <a className="btn ghost nav-login" href="/login">
                Login
              </a>
            )}
          </div>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
