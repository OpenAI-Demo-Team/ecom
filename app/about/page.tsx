export default function AboutPage() {
  return (
    <>
      <section className="panel hero fade-in-up">
        <div className="hero-grid">
          <div>
            <p className="kicker">About AgentMarket</p>
            <h1>
              Built for teams shipping <span className="gradient-text">AI agents in production</span>
            </h1>
            <p>
              AgentMarket was founded in San Francisco to help developer communities discover, compare,
              and buy specialized developer agents. We blend developer social discovery with a practical
              marketplace so teams can find agents recommended by peers and deploy them with confidence.
            </p>
          </div>
          <aside className="hero-aside">
            <p className="kicker">What we optimize</p>
            <div className="stat-stack">
              <div>
                <span>Reliability</span>
                <strong>Self-healing checkout and remediation loops</strong>
              </div>
              <div>
                <span>Speed</span>
                <strong>Minutes from idea to deployable agent config</strong>
              </div>
              <div>
                <span>Control</span>
                <strong>Simple auth, persistent data, and inspectable workflows</strong>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="panel fade-in-up fade-in-up-delay-1">
        <p className="kicker">Our mission</p>
        <h2 className="section-title">Make AI operations boring and dependable</h2>
        <p className="subhead" style={{ maxWidth: "72ch" }}>
          We believe developer tooling should spread through trusted stories, not opaque hype. That is why
          AgentMarket combines social proof from real engineering teams with transparent agent listings,
          hands-on playground validation, and operational safeguards for production rollout.
        </p>
      </section>

      <section className="panel fade-in-up fade-in-up-delay-2">
        <div className="row-between">
          <div>
            <p className="kicker">How we work</p>
            <h2 className="section-title">Three principles</h2>
          </div>
        </div>

        <div className="grid cols-3" style={{ marginTop: "1rem" }}>
          <article className="card">
            <p className="kicker">01</p>
            <h3>Community-first discovery</h3>
            <p>
              Developers learn from developers. Every listed agent includes practical usage context and
              credible implementation stories from teams in production.
            </p>
          </article>
          <article className="card">
            <p className="kicker">02</p>
            <h3>Marketplace transparency</h3>
            <p>
              We make pricing, capabilities, and tradeoffs clear so teams can choose the right developer
              agents without guesswork.
            </p>
          </article>
          <article className="card">
            <p className="kicker">03</p>
            <h3>Production confidence</h3>
            <p>
              Codex-powered customization and resilient workflows let teams roll out improvements in safe,
              testable steps.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
