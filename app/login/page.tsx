export default function LoginPage({
  searchParams
}: {
  searchParams: { error?: string; next?: string };
}) {
  const next = searchParams.next && searchParams.next.startsWith("/") ? searchParams.next : "/";
  const hasError = searchParams.error === "invalid";

  return (
    <section className="panel auth-panel fade-in-up" style={{ maxWidth: "920px" }}>
      <div className="login-split">
        <div className="login-brand">
          <div>
            <p className="kicker">StackStore</p>
            <h1>
              Sign in to{" "}
              <span className="gradient-text">StackStore</span>
            </h1>
          </div>
          <div style={{ display: "grid", gap: "0.9rem" }}>
            <div className="login-feature">
              <div className="login-feature-icon">{"\u{1F6D2}"}</div>
              <div className="login-feature-text">
                <h4>Browse &amp; purchase</h4>
                <p>Add dev gear to your cart and apply promo codes</p>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon">{"\u{1F527}"}</div>
              <div className="login-feature-text">
                <h4>Self-healing pipeline</h4>
                <p>Watch Codex diagnose and fix bugs automatically</p>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon">{"\u{1F4CA}"}</div>
              <div className="login-feature-text">
                <h4>Ops Console</h4>
                <p>Real-time metrics and remediation timeline</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          {hasError && (
            <div className="alert-banner error" style={{ marginBottom: "1rem" }}>
              <span className="alert-banner-icon">{"\u26A0\uFE0F"}</span>
              <div className="alert-banner-content">
                <h4 style={{ color: "var(--danger)" }}>Invalid credentials</h4>
                <p>Try one of the demo accounts below.</p>
              </div>
            </div>
          )}

          <form className="auth-form" method="post" action="/api/auth/login">
            <input type="hidden" name="next" value={next} />
            <label>
              Email
              <input name="email" type="email" placeholder="admin@stackstore.demo" required />
            </label>
            <label>
              Password
              <input name="password" type="password" placeholder="admin123" required />
            </label>
            <button className="btn" type="submit" style={{ width: "100%" }}>
              Sign in
            </button>
          </form>

          <p className="kicker" style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>
            Demo accounts
          </p>
          <div className="grid cols-2" style={{ gap: "0.5rem" }}>
            <article className="card" style={{ padding: "0.8rem" }}>
              <div className="pill" style={{ marginBottom: "0.4rem" }}>Admin</div>
              <p style={{ fontSize: "0.8rem", color: "var(--ink)", margin: "0 0 0.1rem" }}>
                admin@stackstore.demo
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}>admin123</p>
            </article>
            <article className="card" style={{ padding: "0.8rem" }}>
              <div className="pill" style={{ marginBottom: "0.4rem" }}>Customer</div>
              <p style={{ fontSize: "0.8rem", color: "var(--ink)", margin: "0 0 0.1rem" }}>
                buyer@stackstore.demo
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}>buyer123</p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
