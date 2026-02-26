import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getUserFromRequest } from "@/src/backend/auth/request";
import { updateStore } from "@/src/backend/db/store";
import { createLatencyIncidentBug, getConfiguredJiraBoardUrl } from "@/src/backend/services/jiraService";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();
  let alreadyOpen = false;

  await updateStore((store) => {
    if (store.latencyIncidentOpen && !store.latencyBugFixed) {
      alreadyOpen = true;
      return;
    }

    store.latencyIncidentOpen = true;
    store.latencyBugFixed = false;
    store.latencyIncidentReportedAt = now;
    store.apiMetrics.profileLoadAvgMs = 760;
    store.apiMetrics.profileLoadP95Ms = 980;
    store.apiMetrics.lastChecked = now;
    store.errorLogs.unshift({
      id: randomUUID(),
      area: "PROFILE_LOAD",
      message: "User-reported latency spike on /api/internal/diagnostics.",
      metadata: {
        source: "admin-console",
        reportType: "latency",
        endpoint: "/api/internal/diagnostics",
        reportedBy: user.id,
      },
      createdAt: now,
    });
  });

  if (alreadyOpen) {
    return NextResponse.json({
      status: "already_open",
      reportedAt: now,
      jira: {
        status: "skipped",
        message: "Incident is already open.",
        boardUrl: getConfiguredJiraBoardUrl(),
      },
    });
  }

  const jira = await createLatencyIncidentBug({
    summary: "Latency spike: /api/internal/diagnostics exceeds 200ms",
    details:
      "Users reported elevated latency on /api/internal/diagnostics. This endpoint is intentionally isolated from primary demo flows and should be remediated without impacting user-facing pages.",
    reporterName: user.name,
  });

  await updateStore((store) => {
    const latest = store.errorLogs[0];
    if (!latest) return;
    latest.metadata = {
      ...latest.metadata,
      jiraStatus: jira.status,
      jiraIssueKey: jira.issueKey,
      jiraIssueUrl: jira.issueUrl,
      jiraBoardUrl: jira.boardUrl,
    };
  });

  return NextResponse.json({
    status: "reported",
    reportedAt: now,
    jira,
  });
}
