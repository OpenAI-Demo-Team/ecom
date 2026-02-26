import { NextResponse } from "next/server";
import { readStore } from "@/src/backend/db/store";

export async function GET() {
  const store = await readStore();
  return NextResponse.json({
    runs: store.loopRuns.map((run) => ({
      id: run.id,
      status: run.status,
      latencyMs: run.latencyMs,
      codexProvider: run.codexProvider,
      patchDiff: run.patchDiff,
      regressionTest: run.regressionTest,
      prTitle: run.prTitle,
      reviewSummary: run.reviewSummary,
      mergeSummary: run.mergeSummary,
      jiraIssueUrl: run.jiraIssueUrl,
      jiraBoardUrl: run.jiraBoardUrl,
      githubPrUrl: run.githubPrUrl,
      githubReviewCommentUrl: run.githubReviewCommentUrl,
      cloudTaskId: run.cloudTaskId,
      timeline: run.timeline,
      createdAt: run.createdAt,
    })),
  });
}
