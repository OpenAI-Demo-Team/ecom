import { getRecommendations } from "../src/backend/services/catalog";

export default function RecommendationsCarousel({ productId }: { productId: string }) {
  const items = getRecommendations(productId);

  return (
    <section className="panel fade-in-up fade-in-up-delay-1">
      <p className="kicker">Recommended pairings</p>
      <h3 className="section-title">Complementary agents</h3>
      <div className="scroller">
        {items.map((item) => (
          <article className="card product-card" key={item.id} data-category={item.category.toLowerCase()}>
            <img className="product-image" src={item.imageUrl} alt={item.name} loading="lazy" />
            <div className="pill">{item.category}</div>
            <h4 style={{ marginTop: "0.5rem" }}>{item.name}</h4>
            <p>{item.description}</p>
            <div className="tag-list">
              {item.capabilities.slice(0, 3).map((cap) => (
                <span key={cap}>{cap}</span>
              ))}
            </div>
            <div className="price">${(item.priceCents / 100).toFixed(2)} / month</div>
            <a className="btn subtle" href={`/products/${item.id}`}>
              View Agent
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
