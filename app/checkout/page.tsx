import { getCurrentUser } from "../../src/backend/auth/server";
import { getCartSummary } from "../../src/backend/services/cartStore";
import { calculateCartTotalFixed, type CartLine } from "../../src/backend/services/checkout";

export default async function CheckoutPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className="panel auth-panel fade-in-up">
        <p className="kicker">Checkout</p>
        <h2 className="section-title">Sign in to checkout</h2>
        <p className="subhead" style={{ marginBottom: "1rem" }}>
          You need to be signed in to view checkout diagnostics and trigger the remediation loop.
        </p>
        <a className="btn" href="/login?next=/checkout">Sign in</a>
      </section>
    );
  }

  const cart = await getCartSummary(user.id);

  if (cart.lines.length === 0) {
    return (
      <section className="panel auth-panel fade-in-up">
        <p className="kicker">Checkout</p>
        <h2 className="section-title">No agents in cart</h2>
        <p className="subhead" style={{ marginBottom: "1rem" }}>
          Add an agent and apply the <strong>AGENT10</strong> promo code to trigger the checkout bug.
        </p>
        <a className="btn" href="/products">Browse Agents</a>
      </section>
    );
  }

  const checkoutLines: CartLine[] = cart.lines.map((l) => ({ sku: l.sku, qty: l.qty, unitPriceCents: l.unitPriceCents }));
  const expectedTotal = calculateCartTotalFixed(checkoutLines, cart.promo);
  const mismatch = cart.totalCents !== expectedTotal;

  return (
    <>
      {mismatch ? (
        <div className="alert-banner error fade-in-up">
          <span className="alert-banner-icon">{"\u{1F6A8}"}</span>
          <div className="alert-banner-content">
            <h4 style={{ color: "var(--danger)" }}>Bug detected: promo discount applied twice</h4>
            <p>Total is ${((expectedTotal - cart.totalCents) / 100).toFixed(2)} lower than expected. The AGENT10 discount is subtracted twice in <code>calculateCartTotal</code>.</p>
          </div>
        </div>
      ) : (
        <div className="alert-banner success fade-in-up">
          <span className="alert-banner-icon">{"\u2705"}</span>
          <div className="alert-banner-content">
            <h4 style={{ color: "var(--success)" }}>Healthy: promo calculation correct</h4>
            <p>All checkout totals match expected values. The self-healing pipeline resolved the issue.</p>
          </div>
        </div>
      )}

      <div className="split fade-in-up fade-in-up-delay-1">
        <article className="card checkout-card">
          <p className="kicker">Checkout diagnostics</p>
          <h2 className="section-title">Promo verification</h2>
          <div style={{ marginTop: "0.4rem" }}>
            <div className="comparison-row header"><div className="comparison-cell">Field</div><div className="comparison-cell">Expected</div><div className="comparison-cell">Actual</div></div>
            <div className="comparison-row"><div className="comparison-cell" style={{ color: "var(--muted)" }}>Subtotal</div><div className="comparison-cell">${(cart.subtotalCents / 100).toFixed(2)}</div><div className="comparison-cell">${(cart.subtotalCents / 100).toFixed(2)}</div></div>
            <div className="comparison-row"><div className="comparison-cell" style={{ color: "var(--muted)" }}>Promo</div><div className="comparison-cell">{cart.promo?.code ?? "None"}</div><div className="comparison-cell">{cart.promo?.code ?? "None"}</div></div>
            <div className="comparison-row"><div className="comparison-cell" style={{ color: "var(--muted)", fontWeight: 700 }}>Total</div><div className="comparison-cell expected">${(expectedTotal / 100).toFixed(2)}</div><div className={`comparison-cell ${mismatch ? "actual-bad" : "actual-good"}`}>${(cart.totalCents / 100).toFixed(2)}</div></div>
          </div>
          <div className="signal-strip"><span>Promo: AGENT10</span><span>Threshold: 2%</span><span>Status: {cart.promoBugFixed ? "Fixed" : "Monitoring"}</span></div>
        </article>

        <article className="card checkout-card">
          <p className="kicker">Codex remediation</p>
          <h3>Run the self-healing pipeline</h3>
          <p>Triggers incident detection, Codex analysis, patch generation, auto-review, and merge.</p>
          {user.role === "ADMIN" ? (
            <form method="post" action="/api/loop/run">
              <button type="submit" className={`btn ${mismatch ? "danger-glow" : "brand-fill"}`} style={{ width: "100%" }}>
                {mismatch ? "Run Codex Remediation" : "Re-run Loop"}
              </button>
            </form>
          ) : (
            <div className="notice" style={{ marginTop: "0.4rem" }}><strong>Admin only.</strong> Sign in as admin to execute the loop.</div>
          )}
          <a className="btn ghost" href="/admin" style={{ width: "100%", textAlign: "center" }}>Open Ops Console</a>
        </article>
      </div>
    </>
  );
}
