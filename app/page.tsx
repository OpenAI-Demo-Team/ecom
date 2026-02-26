import { getCurrentUser } from "../src/backend/auth/server";
import { products } from "../src/backend/services/catalog";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <>
      {/* Hero */}
      <section className="panel hero fade-in-up">
        <div className="hero-grid">
          <div>
            <p className="kicker">AgentMarket</p>
            <h1>
              Discover &amp; deploy{" "}
              <span className="gradient-text">production-ready AI agents</span>
            </h1>
            <p>
              Browse our marketplace of AI agents for support, sales, and operations.
              Purchase agents, customize them in the Playground, and deploy to production
              &mdash; all in one place.
            </p>
            <div className="inline">
              <a className="btn" href="/products">
                Browse Agents
              </a>
              <a className="btn ghost" href="/playground">
                Try the Playground
              </a>
            </div>
          </div>
          <aside className="hero-aside">
            <p className="kicker">Platform highlights</p>
            <div className="stat-stack">
              <div>
                <span>Agents</span>
                <strong>3 production-ready agents</strong>
              </div>
              <div>
                <span>Playground</span>
                <strong>Codex-powered agent customization</strong>
              </div>
              <div>
                <span>Infrastructure</span>
                <strong>Self-healing checkout pipeline</strong>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Features strip */}
      <div className="metrics-strip fade-in-up fade-in-up-delay-1">
        <div className="metrics-strip-item">
          <div className="metrics-strip-value">3</div>
          <div className="metrics-strip-label">AI Agents</div>
        </div>
        <div className="metrics-strip-item">
          <div className="metrics-strip-value">{"\u2728"}</div>
          <div className="metrics-strip-label">Codex Playground</div>
        </div>
        <div className="metrics-strip-item">
          <div className="metrics-strip-value">4</div>
          <div className="metrics-strip-label">Test Suites</div>
        </div>
        <div className="metrics-strip-item">
          <div className="metrics-strip-value">{"\u{1F6E1}\uFE0F"}</div>
          <div className="metrics-strip-label">Self-Healing</div>
        </div>
      </div>

      {/* Agent Catalog */}
      <section className="panel fade-in-up fade-in-up-delay-2">
        <div className="row-between">
          <div>
            <p className="kicker">Agent catalog</p>
            <h2 className="section-title">Production-ready AI agents</h2>
          </div>
          <a className="inline-link" href="/products">
            View all &rarr;
          </a>
        </div>

        <div className="grid cols-3" style={{ marginTop: "1rem" }}>
          {products.map((agent) => (
            <article
              className="card product-card"
              key={agent.id}
              data-category={agent.category.toLowerCase()}
            >
              <img className="product-image" src={agent.imageUrl} alt={agent.name} loading="lazy" />
              <div className="card-topline">
                <span className="pill">{agent.category}</span>
                <span className="muted">{agent.seatsIncluded} seats</span>
              </div>
              <h3>{agent.name}</h3>
              <p>{agent.description}</p>
              <div className="price">${(agent.priceCents / 100).toFixed(2)} / month</div>
              <a className="btn subtle" href={`/products/${agent.id}`}>
                View Agent
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* Playground CTA */}
      <section className="panel fade-in-up fade-in-up-delay-3" style={{ textAlign: "center" }}>
        <p className="kicker">Powered by Codex</p>
        <h2 className="section-title">Customize any agent in seconds</h2>
        <p className="subhead" style={{ maxWidth: "36rem", margin: "0 auto 1.2rem" }}>
          Describe your use case in plain English and Codex will generate a custom agent
          configuration with integration code &mdash; ready to deploy.
        </p>
        <a className="btn" href="/playground">
          Open the Playground
        </a>
      </section>
    </>
  );
}
