import { NextResponse } from "next/server";
import { readStore } from "@/src/backend/db/store";

export async function GET() {
  const store = await readStore();
  const latestRun = store.loopRuns[0];
  const remediationPending = latestRun?.status === "pending";
  const degraded = !store.latencyBugFixed || remediationPending;
  const latestIncidentLog = store.errorLogs.find((log) => log.area === "PROFILE_LOAD");
  const latestRunWithLinks = store.loopRuns.find((run) => Boolean(run.githubPrUrl) || Boolean(run.githubReviewCommentUrl));

  const jiraIssueUrl =
    latestIncidentLog && typeof latestIncidentLog.metadata?.jiraIssueUrl === "string"
      ? latestIncidentLog.metadata.jiraIssueUrl
      : undefined;
  const jiraBoardUrl =
    latestIncidentLog && typeof latestIncidentLog.metadata?.jiraBoardUrl === "string"
      ? latestIncidentLog.metadata.jiraBoardUrl
      : undefined;

  const apis = [
    {
      id: "posts",
      endpoint: "/api/posts",
      owner: "Feed",
      avgMs: 36,
      p95Ms: 88,
      thresholdMs: 200,
      status: "healthy" as const,
      fixable: false,
    },
    {
      id: "friends",
      endpoint: "/api/friends/suggested",
      owner: "Social",
      avgMs: 28,
      p95Ms: 74,
      thresholdMs: 200,
      status: "healthy" as const,
      fixable: false,
    },
    {
      id: "profiles",
      endpoint: "/api/profile/[username]",
      owner: "Profiles",
      avgMs: 48,
      p95Ms: 96,
      thresholdMs: 200,
      status: "healthy" as const,
      fixable: false,
    },
    {
      id: "diagnostics",
      endpoint: "/api/internal/diagnostics",
      owner: "Diagnostics",
      avgMs: store.apiMetrics.profileLoadAvgMs,
      p95Ms: store.apiMetrics.profileLoadP95Ms,
      thresholdMs: 200,
      status: degraded ? ("degraded" as const) : ("healthy" as const),
      fixable: true,
      jiraIssueUrl,
      jiraBoardUrl,
      prUrl: latestRunWithLinks?.githubPrUrl,
      codexReviewUrl: latestRunWithLinks?.githubReviewCommentUrl,
      mergeSummary: latestRunWithLinks?.mergeSummary,
    },
  ];

  const degradedCount = apis.filter((api) => api.status === "degraded").length;

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    degradedCount,
    total: apis.length,
    apis,
  });
}
