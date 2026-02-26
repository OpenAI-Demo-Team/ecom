import RecommendationsCarousel from "../../../components/AIRecommendationsCarousel";
import { getCurrentUser } from "../../../src/backend/auth/server";
import { getProductById } from "../../../src/backend/services/catalog";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = getProductById(params.id);
  const user = await getCurrentUser();

  if (!product) {
    return (
      <section className="panel fade-in-up">
        <p className="kicker">Agent detail</p>
        <h2 className="section-title">Agent not found</h2>
        <p className="subhead" style={{ marginBottom: "1rem" }}>
          This agent doesn&apos;t exist in the catalog.
        </p>
        <a className="btn ghost" href="/products">Back to Catalog</a>
      </section>
    );
  }

  return (
    <>
      <section className="panel split fade-in-up">
        <article className="card product-card" data-category={product.category.toLowerCase()}>
          <img className="product-image hero-image" src={product.imageUrl} alt={product.name} />
          <div className="card-topline">
            <span className="pill">{product.category}</span>
            <span className="muted">SKU: {product.id}</span>
          </div>
          <h2 className="section-title">{product.name}</h2>
          <p style={{ lineHeight: 1.65 }}>{product.description}</p>
          <div className="tag-list">
            {product.capabilities.map((cap) => (
              <span key={cap}>{cap}</span>
            ))}
          </div>
        </article>

        <article className="card checkout-card">
          <p className="kicker">License</p>
          <div className="price" style={{ fontSize: "1.5rem" }}>
            ${(product.priceCents / 100).toFixed(2)}
            <span style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 400 }}> / month</span>
          </div>
          <div className="meta-list">
            <div className="meta-row">
              <span>Seats included</span>
              <strong>{product.seatsIncluded}</strong>
            </div>
            <div className="meta-row">
              <span>Available licenses</span>
              <strong>{product.inventory}</strong>
            </div>
            <div className="meta-row">
              <span>Promo eligible</span>
              <strong style={{ color: "var(--success)" }}>Yes (AGENT10)</strong>
            </div>
          </div>
          {user ? (
            <form method="post" action="/api/cart/add">
              <input type="hidden" name="sku" value={product.id} />
              <input type="hidden" name="redirectTo" value="/cart" />
              <button className="btn" type="submit" style={{ width: "100%" }}>
                Add to Cart
              </button>
            </form>
          ) : (
            <a className="btn" href={`/login?next=/products/${product.id}`} style={{ width: "100%", textAlign: "center" }}>
              Sign in to Add
            </a>
          )}
          <a className="btn ghost" href="/playground" style={{ width: "100%", textAlign: "center", marginTop: "0.4rem" }}>
            Customize in Playground
          </a>
        </article>
      </section>

      <RecommendationsCarousel productId={product.id} />
    </>
  );
}
