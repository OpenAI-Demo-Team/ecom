import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getUserFromRequest } from "@/src/backend/auth/request";
import { readStore, updateStore } from "@/src/backend/db/store";
import { analyzeLatencyIssue, generateCodexReviewComment } from "@/src/backend/services/codexSdkClient";
import {
  createLatencyIncidentBug,
  getConfiguredJiraBoardUrl,
  transitionJiraIssueToTodo,
} from "@/src/backend/services/jiraService";
import {
  createIncidentPullRequest,
  mergePullRequest,
  postPullRequestComment,
  readIncidentGitHubConfig,
} from "@/src/backend/services/githubIncidentService";

function isAutoMergeEnabled(): boolean {
  const raw = (process.env.INCIDENT_AUTO_MERGE ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const store = await readStore();
  const degraded = !store.latencyBugFixed;

  if (!degraded) {
    const run = {
      id: randomUUID(),
      status: "healthy" as const,
      latencyMs: store.apiMetrics.profileLoadP95Ms,
      codexProvider: "fallback" as const,
      patchDiff: "No patch needed. Target API is healthy.",
      regressionTest: "All regression checks pass.",
      prTitle: "No remediation needed",
      reviewSummary: "All APIs healthy. No Codex action required.",
      mergeSummary: "Skipped",
      timeline: [
        {
          label: "Health Check",
          status: "done" as const,
          detail: `All API endpoints healthy. /api/internal/diagnostics P95 is ${store.apiMetrics.profileLoadP95Ms}ms.`,
          at: now.toISOString(),
        },
      ],
      createdAt: now.toISOString(),
    };

    await updateStore((s) => {
      s.loopRuns.unshift(run);
    });

    return NextResponse.json({ status: "healthy", run });
  }

  const latestIncidentLog = store.errorLogs.find((log) => log.area === "PROFILE_LOAD");
  const existingJiraIssueUrl =
    latestIncidentLog && typeof latestIncidentLog.metadata?.jiraIssueUrl === "string"
      ? latestIncidentLog.metadata.jiraIssueUrl
      : undefined;
  const existingJiraIssueKey =
    latestIncidentLog && typeof latestIncidentLog.metadata?.jiraIssueKey === "string"
      ? latestIncidentLog.metadata.jiraIssueKey
      : undefined;
  const existingJiraBoardUrl =
    latestIncidentLog && typeof latestIncidentLog.metadata?.jiraBoardUrl === "string"
      ? latestIncidentLog.metadata.jiraBoardUrl
      : undefined;

  let jiraIssueUrl = existingJiraIssueUrl;
  let jiraIssueKey = existingJiraIssueKey;
  let jiraBoardUrl = existingJiraBoardUrl ?? getConfiguredJiraBoardUrl();
  let jiraStatusMessage = "Using existing Jira incident.";

  if (!jiraIssueUrl) {
    const jira = await createLatencyIncidentBug({
      summary: "Latency spike: /api/internal/diagnostics exceeds 200ms",
      details:
        "Detected degraded latency in /api/internal/diagnostics. This endpoint is isolated from user-facing flows and used for self-healing demo remediation.",
      reporterName: user.name,
    });
    jiraIssueUrl = jira.issueUrl;
    jiraIssueKey = jira.issueKey;
    jiraBoardUrl = jira.boardUrl ?? jiraBoardUrl;
    jiraStatusMessage = jira.message;
  }

  const patchDiff = `--- a/app/api/internal/diagnostics/route.ts
+++ b/app/api/internal/diagnostics/route.ts
@@ -10,8 +10,4 @@ export async function GET() {
-  if (isLatencyBugActive) {
-    await new Promise((resolve) => setTimeout(resolve, ARTIFICIAL_DELAY_MS));
-  }
-
   const elapsed = Date.now() - startedAt;
   const avg = 45;
   const p95 = 95;`;

  const analysis = await analyzeLatencyIssue(store.apiMetrics);
  let jiraWorkflowDetail = "Jira issue key missing; cannot move workflow to To Do.";
  if (jiraIssueKey) {
    const workflowTransition = await transitionJiraIssueToTodo(jiraIssueKey);
    jiraWorkflowDetail = workflowTransition.message;
  }

  let githubPrUrl: string | undefined;
  let githubReviewCommentUrl: string | undefined;
  let prTitle = "fix(diagnostics): remove artificial latency in diagnostics API";
  let prDetail = "GitHub PR not created (missing incident GitHub config).";
  let reviewDetail = analysis.recommendation;
  let mergeDetail = "Waiting for manual merge.";
  let didMerge = false;
  const autoMerge = isAutoMergeEnabled();

  const ghConfig = readIncidentGitHubConfig();
  if (ghConfig) {
    try {
      const suffix = Date.now().toString().slice(-6);
      const prBody = [
        "## Summary",
        "- Remove intentional latency delay from `/api/internal/diagnostics`.",
        "- Keep all user-facing APIs untouched.",
        jiraIssueUrl ? `- Jira: ${jiraIssueUrl}` : "- Jira: not linked",
        "",
        "## Patch",
        "```diff",
        patchDiff,
        "```",
      ].join("\n");

      const createdPr = await createIncidentPullRequest({
        config: ghConfig,
        title: prTitle,
        body: prBody,
        filePath: `incident-fixes/diagnostics-${suffix}.md`,
        fileContent: `${prBody}\n`,
        branchSuffix: suffix,
      });

      githubPrUrl = createdPr.url;
      prDetail = `Created PR #${createdPr.number}: ${createdPr.url}`;

      const codexReview = await generateCodexReviewComment({
        issueSummary: analysis.summary,
        patchDiff,
        jiraIssueKey,
      });
      reviewDetail = `${codexReview.comment}`;

      const comment = await postPullRequestComment({
        config: ghConfig,
        pullNumber: createdPr.number,
        body: `@codex please review this remediation patch.\n\n${codexReview.comment}`,
      });
      githubReviewCommentUrl = comment.url;

      if (autoMerge) {
        const mergeResult = await mergePullRequest({
          config: ghConfig,
          pullNumber: createdPr.number,
          commitTitle: "fix(diagnostics): remove artificial latency in diagnostics API",
        });
        didMerge = mergeResult.merged;
        mergeDetail = mergeResult.merged
          ? `Merged PR automatically. ${githubPrUrl}`
          : `Merge pending/manual: ${mergeResult.message}`;
      } else {
        mergeDetail = githubPrUrl
          ? `PR opened and awaiting manual merge: ${githubPrUrl}`
          : "PR opened and awaiting manual merge.";
      }
    } catch (err) {
      prDetail = err instanceof Error ? `PR creation failed: ${err.message}` : "PR creation failed.";
      mergeDetail = "Merge skipped because PR was not created.";
    }
  }

  const timeline = [
    {
      label: "Detect Anomaly",
      status: "done" as const,
      detail: `/api/internal/diagnostics P95 is ${store.apiMetrics.profileLoadP95Ms}ms (threshold: 200ms).`,
      at: now.toISOString(),
    },
    {
      label: "Open Jira Ticket",
      status: "done" as const,
      detail: `${jiraStatusMessage}${jiraIssueUrl ? ` ${jiraIssueUrl}` : ""}`,
      at: new Date(now.getTime() + 1_000).toISOString(),
    },
    {
      label: "Move Jira to To Do",
      status: jiraWorkflowDetail.includes("failed") ? ("pending" as const) : ("done" as const),
      detail: jiraWorkflowDetail,
      at: new Date(now.getTime() + 2_000).toISOString(),
    },
    {
      label: "Analyze with Codex",
      status: "done" as const,
      detail: analysis.summary,
      at: new Date(now.getTime() + 3_000).toISOString(),
    },
    {
      label: "Generate Patch",
      status: "done" as const,
      detail: "Removed artificial latency branch from /api/internal/diagnostics.",
      at: new Date(now.getTime() + 4_000).toISOString(),
    },
    {
      label: "Create PR",
      status: "done" as const,
      detail: prDetail,
      at: new Date(now.getTime() + 5_000).toISOString(),
    },
    {
      label: "Codex Review Comment",
      status: "done" as const,
      detail: githubReviewCommentUrl ? `Posted: ${githubReviewCommentUrl}` : reviewDetail,
      at: new Date(now.getTime() + 6_000).toISOString(),
    },
    {
      label: "Merge",
      status: didMerge ? ("done" as const) : ("pending" as const),
      detail: mergeDetail,
      at: new Date(now.getTime() + 7_000).toISOString(),
    },
  ];

  const runStatus = didMerge ? ("fixed" as const) : ("pending" as const);
  const run = {
    id: randomUUID(),
    status: runStatus,
    latencyMs: store.apiMetrics.profileLoadP95Ms,
    codexProvider: analysis.provider,
    patchDiff,
    regressionTest: didMerge
      ? "Diagnostics endpoint latency now under 200ms."
      : "Awaiting merge/deploy; endpoint remains degraded until PR is merged.",
    prTitle,
    reviewSummary: analysis.rootCause,
    mergeSummary: mergeDetail,
    jiraIssueUrl,
    jiraBoardUrl,
    githubPrUrl,
    githubReviewCommentUrl,
    timeline,
    createdAt: now.toISOString(),
  };

  await updateStore((s) => {
    if (didMerge) {
      s.latencyBugFixed = true;
      s.latencyIncidentOpen = false;
      s.latencyIncidentReportedAt = null;
      s.apiMetrics.profileLoadAvgMs = 45;
      s.apiMetrics.profileLoadP95Ms = 95;
      s.apiMetrics.lastChecked = now.toISOString();
    } else {
      s.latencyBugFixed = false;
      s.latencyIncidentOpen = true;
      s.apiMetrics.lastChecked = now.toISOString();
    }

    const log = s.errorLogs.find((entry) => entry.area === "PROFILE_LOAD");
    if (log) {
      log.metadata = {
        ...log.metadata,
        jiraIssueKey,
        jiraIssueUrl,
        jiraBoardUrl,
      };
    } else {
      s.errorLogs.unshift({
        id: randomUUID(),
        area: "PROFILE_LOAD",
        message: didMerge
          ? "Latency incident remediated by Codex."
          : "Latency incident mitigation prepared by Codex; awaiting merge.",
        metadata: { jiraIssueKey, jiraIssueUrl, jiraBoardUrl },
        createdAt: now.toISOString(),
      });
    }

    s.loopRuns.unshift(run);
  });

  return NextResponse.json({ status: runStatus, run });
}
