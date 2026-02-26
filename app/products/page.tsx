import { getCurrentUser } from "../../src/backend/auth/server";
import { products } from "../../src/backend/services/catalog";

export default async function ProductListingPage() {
  const user = await getCurrentUser();

  return (
    <section className="panel fade-in-up">
      <div className="row-between">
        <div>
          <p className="kicker">Agent catalog</p>
          <h2 className="section-title">AI agents for support, sales, and operations</h2>
          <p className="subhead">
            Add an agent to your cart, apply <strong>AGENT10</strong>, then head to checkout to see the self-healing pipeline.
          </p>
        </div>
        {user ? (
          <a className="btn subtle" href="/cart">Open Cart</a>
        ) : (
          <a className="btn subtle" href="/login?next=/products">Sign in to Buy</a>
        )}
      </div>

      <div className="grid cols-3" style={{ marginTop: "1.2rem" }}>
        {products.map((agent, i) => (
          <article
            className={`card product-card fade-in-up fade-in-up-delay-${i + 1}`}
            key={agent.id}
            data-category={agent.category.toLowerCase()}
          >
            <img className="product-image" src={agent.imageUrl} alt={agent.name} loading="lazy" />
            <div className="card-topline">
              <span className="pill">{agent.category}</span>
              <span className="muted">{agent.inventory} licenses</span>
            </div>
            <h3>{agent.name}</h3>
            <p>{agent.description}</p>
            <div className="tag-list">
              {agent.capabilities.map((cap) => (
                <span key={cap}>{cap}</span>
              ))}
            </div>
            <div className="price">${(agent.priceCents / 100).toFixed(2)} / month</div>
            <div className="inline" style={{ marginTop: "0.5rem" }}>
              <a className="btn ghost" href={`/products/${agent.id}`}>Details</a>
              {user ? (
                <form method="post" action="/api/cart/add">
                  <input type="hidden" name="sku" value={agent.id} />
                  <input type="hidden" name="redirectTo" value="/cart" />
                  <button className="btn" type="submit">Add to Cart</button>
                </form>
              ) : (
                <a className="btn" href="/login?next=/products">Sign in to Add</a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
