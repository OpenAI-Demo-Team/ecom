import { getCurrentUser } from "../../src/backend/auth/server";
import { getCartSummary } from "../../src/backend/services/cartStore";

export default async function CartPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className="panel auth-panel fade-in-up">
        <p className="kicker">Cart</p>
        <h2 className="section-title">Sign in to manage your cart</h2>
        <p className="subhead" style={{ marginBottom: "1rem" }}>
          Sign in to add agents and apply promo codes.
        </p>
        <a className="btn" href="/login?next=/cart">Sign in</a>
      </section>
    );
  }

  const cart = await getCartSummary(user.id);

  if (cart.lines.length === 0) {
    return (
      <section className="panel auth-panel fade-in-up" style={{ textAlign: "center", padding: "3rem 2rem" }}>
        <h2 className="section-title">Your cart is empty</h2>
        <p className="subhead" style={{ marginBottom: "1.2rem" }}>
          Add an agent from the catalog, then apply <strong>AGENT10</strong> to trigger the promo bug demo.
        </p>
        <a className="btn" href="/products">Browse Agents</a>
      </section>
    );
  }

  const hasPromo = !!cart.promo;
  const hasBug = !cart.promoBugFixed && hasPromo;

  return (
    <div className="split fade-in-up">
      <article className="card">
        <p className="kicker">Cart</p>
        <h2 className="section-title">Selected agents</h2>
        <div className="grid" style={{ marginTop: "0.5rem" }}>
          {cart.lines.map((line) => (
            <article className="card" key={line.sku}>
              <img className="product-image" src={line.imageUrl} alt={line.name} loading="lazy" />
              <div className="card-topline">
                <h3 style={{ fontSize: "0.95rem", margin: 0 }}>{line.name}</h3>
                <span className="pill">{line.category}</span>
              </div>
              <div className="meta-row product-meta-row">
                <span>Quantity</span>
                <strong>{line.qty}</strong>
              </div>
              <div className="price">${(line.unitPriceCents / 100).toFixed(2)} / month</div>
            </article>
          ))}
        </div>
      </article>

      <article className="card checkout-card">
        <p className="kicker">Promo &amp; total</p>
        <form method="post" action="/api/cart/promo" className="auth-form compact-form">
          <input type="hidden" name="redirectTo" value="/cart" />
          <label>
            Promo code
            <input name="promoCode" defaultValue={cart.promoCode ?? ""} placeholder="AGENT10" />
          </label>
          <button type="submit" className="btn subtle">Apply Promo</button>
        </form>

        {hasPromo && (
          <div className={hasBug ? "alert-banner error" : "alert-banner success"} style={{ marginTop: "0.4rem" }}>
            <span className="alert-banner-icon">{hasBug ? "\u26A0\uFE0F" : "\u2705"}</span>
            <div className="alert-banner-content">
              <h4 style={{ color: hasBug ? "var(--warning)" : "var(--success)", fontSize: "0.83rem" }}>
                {hasBug ? "Bug active: discount applied twice" : "Fixed by Codex remediation"}
              </h4>
            </div>
          </div>
        )}

        <div className="meta-list" style={{ marginTop: "0.7rem" }}>
          <div className="meta-row"><span>Subtotal</span><strong>${(cart.subtotalCents / 100).toFixed(2)}</strong></div>
          <div className="meta-row"><span>Promo</span><strong>{cart.promo?.code ?? "None"}</strong></div>
        </div>

        <div className="checkout-total row-between">
          <span>Total</span>
          <strong style={{ fontSize: "1.15rem" }}>${(cart.totalCents / 100).toFixed(2)}</strong>
        </div>

        <a className="btn" href="/checkout" style={{ width: "100%", textAlign: "center", marginTop: "0.4rem" }}>
          Continue to Checkout
        </a>
      </article>
    </div>
  );
}
