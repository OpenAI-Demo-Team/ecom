import { isAuthorized } from "../../src/backend/auth/server";
import { getAdminLoopState } from "../../src/backend/services/incidentLoop";

export default async function AdminDashboardPage() {
  const auth = await isAuthorized("ADMIN");

  if (!auth.allowed) {
    return (
      <section className="panel auth-panel fade-in-up">
        <p className="kicker">Ops console</p>
        <h2 className="section-title">Admin authorization required</h2>
        <p className="subhead" style={{ marginBottom: "1.2rem" }}>
          The Ops Console shows real-time incident metrics and the Codex remediation timeline.
        </p>
        <a className="btn" href="/login?next=/admin">
          Sign in as Admin
        </a>
      </section>
    );
  }

  const state = await getAdminLoopState();
  const latest = state.loopRuns[0];

  const errorRateColor =
    state.errorRate > 0.02
      ? "var(--danger)"
      : state.errorRate > 0
        ? "var(--warning)"
        : "var(--success)";

  return (
    <>
      <section className="panel fade-in-up">
        <div className="row-between">
          <div>
            <p className="kicker">Ops console</p>
            <h2 className="section-title">Checkout incident + Codex remediation</h2>
          </div>
          <div className="inline" style={{ marginTop: 0 }}>
            <form method="post" action="/api/loop/run">
              <button type="submit" className={`btn ${!state.promoBugFixed ? "danger-glow" : "brand-fill"}`}>
                Run Codex Loop
              </button>
            </form>
            <form method="post" action="/api/loop/reset">
              <button type="submit" className="btn ghost">
                Reset Demo
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="grid cols-3 fade-in-up fade-in-up-delay-1">
        <article className="card metric-card">
          <p className="kicker">Error rate</p>
          <div className="metric" style={{ color: errorRateColor }}>
            {(state.errorRate * 100).toFixed(1)}%
          </div>
          <p>Threshold: 2.0%</p>
        </article>
        <article className="card metric-card">
          <p className="kicker">Total checkouts</p>
          <div className="metric">{state.totalCheckouts}</div>
          <p>{state.failedCheckouts} failed</p>
        </article>
        <article className="card metric-card">
          <p className="kicker">Promo bug</p>
          <div className="metric" style={{ color: state.promoBugFixed ? "var(--success)" : "var(--danger)" }}>
            {state.promoBugFixed ? "Fixed" : "Active"}
          </div>
          <p>{state.promoBugFixed ? "Resolved by Codex" : "Discount applied twice"}</p>
        </article>
      </div>

      {latest ? (
        <section className="panel fade-in-up fade-in-up-delay-2">
          <div style={{ marginBottom: "1.2rem" }}>
            <p className="kicker">Latest remediation</p>
            <h3 className="section-title" style={{ marginBottom: "0.25rem" }}>{latest.prTitle}</h3>
            <p className="subhead">
              Provider: {latest.provider === "openai-codex" ? "OpenAI Codex (live)" : "Deterministic fallback"}
            </p>
          </div>

          <div className="timeline-stepper">
            {latest.timeline.map((event, i) => {
              const isLast = i === latest.timeline.length - 1;
              const dotClass =
                event.status === "done"
                  ? "done"
                  : event.label.toLowerCase().includes("detect")
                    ? "error"
                    : "active";

              return (
                <div className="timeline-step" key={`${latest.id}-${event.label}`}>
                  <div className="timeline-step-indicator">
                    <div className={`timeline-dot ${dotClass}`} />
                    {!isLast && (
                      <div className={`timeline-connector ${event.status === "done" ? "done" : ""}`} />
                    )}
                  </div>
                  <div className="timeline-step-content">
                    <div className="timeline-step-label">{event.label}</div>
                    <div className="timeline-step-detail">{event.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid cols-2" style={{ marginTop: "1.2rem" }}>
            <article className="card">
              <p className="kicker" style={{ marginBottom: "0.4rem" }}>Patch diff</p>
              <pre className="code-block">{latest.patchDiff}</pre>
            </article>
            <article className="card">
              <p className="kicker" style={{ marginBottom: "0.4rem" }}>Auto-review + merge</p>
              <div className="meta-list" style={{ marginTop: "0.4rem" }}>
                <div className="meta-row">
                  <span>Review</span>
                  <span style={{ color: "var(--success)" }}>{latest.reviewSummary}</span>
                </div>
                <div className="meta-row">
                  <span>Merge</span>
                  <span style={{ color: "var(--success)" }}>{latest.mergeSummary}</span>
                </div>
              </div>
            </article>
          </div>
        </section>
      ) : (
        <section className="panel fade-in-up fade-in-up-delay-2" style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <h3 className="section-title">No remediation runs yet</h3>
          <p className="subhead">
            Hit &ldquo;Run Codex Loop&rdquo; to trigger incident detection, analysis, and auto-merge.
          </p>
        </section>
      )}
    </>
  );
}
