"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AuthUser = {
  id: string;
  role: string;
  name: string;
};

type ApiHealthRow = {
  id: string;
  endpoint: string;
  owner: string;
  avgMs: number;
  p95Ms: number;
  thresholdMs: number;
  status: "healthy" | "degraded";
  fixable: boolean;
  jiraIssueUrl?: string;
  jiraBoardUrl?: string;
  prUrl?: string;
  codexReviewUrl?: string;
  mergeSummary?: string;
};

type HealthPayload = {
  generatedAt: string;
  degradedCount: number;
  total: number;
  apis: ApiHealthRow[];
};

type TimelineStep = {
  label: string;
  status: "done" | "pending";
  detail: string;
  at: string;
};

type LoopRun = {
  id: string;
  status: "healthy" | "pending" | "fixed";
  latencyMs: number;
  codexProvider: string;
  prTitle: string;
  mergeSummary: string;
  jiraIssueUrl?: string;
  jiraBoardUrl?: string;
  githubPrUrl?: string;
  githubReviewCommentUrl?: string;
  timeline: TimelineStep[];
  createdAt: string;
};

function statusColor(status: "healthy" | "degraded"): string {
  return status === "healthy" ? "var(--success)" : "var(--danger)";
}

function LinkPill({ href, label }: { href?: string; label: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.22rem 0.5rem",
        border: "1px solid var(--border)",
        borderRadius: 999,
        marginRight: "0.4rem",
        marginBottom: "0.25rem",
        fontSize: "0.78rem",
        fontWeight: 600,
        textDecoration: "none",
        color: "var(--text-primary)",
        background: "var(--bg-card)",
      }}
    >
      {label}
    </a>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [latestRun, setLatestRun] = useState<LoopRun | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.role !== "ADMIN") {
          setAuthed(false);
        } else {
          setAuthed(true);
          setUser(d.user);
        }
      })
      .catch(() => setAuthed(false));
  }, []);

  const fetchHealth = useCallback(() => {
    fetch("/api/health/apis")
      .then((r) => r.json())
      .then((payload) => setHealth(payload as HealthPayload))
      .catch(() => {});
  }, []);

  const fetchLatestRun = useCallback(() => {
    fetch("/api/loop")
      .then((r) => r.json())
      .then((payload) => {
        const first = Array.isArray(payload?.runs) ? (payload.runs[0] as LoopRun | undefined) : undefined;
        setLatestRun(first ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    const bootstrap = async () => {
      try {
        await fetch("/api/loop/reset", { method: "POST" });
      } catch {
        /* noop */
      }
      if (cancelled) return;
      fetchHealth();
      fetchLatestRun();
    };
    bootstrap();
    intervalRef.current = setInterval(fetchHealth, 5000);
    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [authed, fetchHealth, fetchLatestRun]);

  const runFixForApi = useCallback(async (apiId: string) => {
    if (apiId !== "diagnostics") return;
    setRunning(true);
    setMessage("Running Codex remediation: opening Jira, analyzing, creating PR, and posting review...");
    try {
      const res = await fetch("/api/loop/run", { method: "POST" });
      const payload = await res.json();
      if (payload?.run) {
        const run = payload.run as LoopRun;
        setLatestRun(run);
        if (run.status === "fixed") {
          setMessage("Codex remediation completed and merged. API is now healthy.");
        } else if (run.status === "pending") {
          setMessage("Codex opened remediation PR. API stays degraded until merge is completed.");
        } else {
          setMessage("No remediation needed. API is healthy.");
        }
      } else {
        setMessage("Codex remediation finished without run output.");
      }
    } catch {
      setMessage("Codex remediation failed due to network error.");
    }
    fetchHealth();
    fetchLatestRun();
    setRunning(false);
  }, [fetchHealth, fetchLatestRun]);

  if (authed === null) {
    return (
      <div className="admin-dashboard" style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <div className="spin" style={{ width: 32, height: 32, border: "3px solid #333", borderTopColor: "#6366f1", borderRadius: "50%", margin: "0 auto 1rem" }} />
        <p style={{ color: "#666" }}>Checking authorization...</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="admin-dashboard" style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "3rem", maxWidth: 420, margin: "0 auto" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Admin Authorization Required</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            Ops Console is restricted to admin users.
          </p>
          <a href="/login?next=/admin" className="btn btn-primary" style={{ display: "inline-flex" }}>
            Sign in as Admin
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-section fade-in-up">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>
              Ops Console
            </p>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>API Health Dashboard</h1>
            {user && <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>Signed in as {user.name}</p>}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {health ? `${health.total - health.degradedCount}/${health.total} healthy` : "Loading API status..."}
          </div>
        </div>
      </div>

      <div className="admin-section fade-in-up">
        <h2 style={{ marginBottom: "0.75rem" }}>API Report</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "0.75rem 0.5rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>Endpoint</th>
                <th style={{ textAlign: "left", padding: "0.75rem 0.5rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>Owner</th>
                <th style={{ textAlign: "right", padding: "0.75rem 0.5rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>Avg</th>
                <th style={{ textAlign: "right", padding: "0.75rem 0.5rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>P95</th>
                <th style={{ textAlign: "left", padding: "0.75rem 0.5rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>Status</th>
                <th style={{ textAlign: "left", padding: "0.75rem 0.5rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>Links</th>
                <th style={{ textAlign: "left", padding: "0.75rem 0.5rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(health?.apis ?? []).map((api) => (
                <tr key={api.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.85rem 0.5rem", fontFamily: "var(--font-mono)", fontSize: "0.84rem" }}>{api.endpoint}</td>
                  <td style={{ padding: "0.85rem 0.5rem", color: "var(--text-secondary)" }}>{api.owner}</td>
                  <td style={{ padding: "0.85rem 0.5rem", textAlign: "right" }}>{api.avgMs}ms</td>
                  <td style={{ padding: "0.85rem 0.5rem", textAlign: "right" }}>{api.p95Ms}ms</td>
                  <td style={{ padding: "0.85rem 0.5rem" }}>
                    <span style={{ color: statusColor(api.status), fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase" }}>
                      {api.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.85rem 0.5rem", fontSize: "0.82rem" }}>
                    {api.jiraIssueUrl || api.jiraBoardUrl || api.prUrl || api.codexReviewUrl ? (
                      <div>
                        <LinkPill href={api.jiraIssueUrl} label="Jira" />
                        <LinkPill href={api.jiraBoardUrl} label="Board" />
                        <LinkPill href={api.prUrl} label="PR" />
                        <LinkPill href={api.codexReviewUrl} label="Codex Review" />
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: "0.85rem 0.5rem" }}>
                    {api.fixable && api.status === "degraded" && latestRun?.status === "pending" ? (
                      <span style={{ color: "var(--warning)", fontWeight: 600 }}>Awaiting merge</span>
                    ) : api.fixable && api.status === "degraded" ? (
                      <button className="btn btn-primary" onClick={() => runFixForApi(api.id)} disabled={running}>
                        {running ? "Fixing..." : "Fix in Codex"}
                      </button>
                    ) : api.fixable ? (
                      <span
                        style={{
                          color: latestRun?.status === "pending" ? "var(--warning)" : "var(--success)",
                          fontWeight: 600,
                        }}
                      >
                        {latestRun?.status === "pending" ? "Pending merge" : "Fixed"}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>Healthy</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {message ? (
        <div className="admin-section fade-in-up" style={{ marginTop: "1rem" }}>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>{message}</p>
        </div>
      ) : null}

      <div className="admin-section fade-in-up">
        <h2>Codex Task Timeline</h2>
        {latestRun?.timeline?.length ? (
          <div className="timeline" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem" }}>
            {latestRun.timeline.map((step, idx) => (
              <div
                key={`${latestRun.id}-${idx}`}
                className={step.status === "pending" ? "timeline-step active" : "timeline-step done"}
              >
                <div>
                  <div className="timeline-step-label">{step.label}</div>
                  <div className="timeline-step-detail">
                    {step.detail}
                    {step.at ? (
                      <span style={{ marginLeft: "0.5rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        {new Date(step.at).toLocaleTimeString()}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "2rem", textAlign: "center" }}>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
              Click <strong>Fix in Codex</strong> on the degraded API row to open Jira, create PR, post Codex review comment, and self-heal.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
