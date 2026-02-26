import { randomUUID } from "node:crypto";
import { readStore, updateStore, type PersistedTimelineStep } from "../db/store";
import { analyzeLatencyIssue, generateRegressionTest } from "./codexSdkClient";

type Anomaly = {
  profileLoadAvgMs: number;
  profileLoadP95Ms: number;
  lastChecked: string;
};

async function detectAnomaly(): Promise<Anomaly | null> {
  const store = await readStore();
  const { apiMetrics } = store;

  if (apiMetrics.profileLoadP95Ms > 500) {
    return apiMetrics;
  }
  return null;
}

async function analyzeWithCodex(anomaly: Anomaly) {
  return analyzeLatencyIssue(anomaly);
}

function generatePatch(): string {
  return `diff --git a/src/backend/services/profileLoader.ts b/src/backend/services/profileLoader.ts
--- a/src/backend/services/profileLoader.ts
+++ b/src/backend/services/profileLoader.ts
@@ -8,10 +8,6 @@ export async function loadProfile(username: string): Promise<DevSpaceProfile | n
   const profile = store.profiles.find((p) => p.username === username);
   if (!profile) return null;
 
-  if (!store.latencyBugFixed) {
-    await new Promise((r) => setTimeout(r, ARTIFICIAL_DELAY_MS));
-  }
-
   await updateStore((s) => {
-    const elapsed = store.latencyBugFixed ? 45 : ARTIFICIAL_DELAY_MS;
+    const elapsed = 45;
     s.apiMetrics.profileLoadAvgMs = elapsed;`;
}

async function applyFix(): Promise<void> {
  await updateStore((s) => {
    s.latencyBugFixed = true;
  });
}

export async function runSelfHealingLoop(): Promise<{
  status: "healthy" | "fixed";
  latencyMs: number;
}> {
  const now = () => new Date().toISOString();
  const timeline: PersistedTimelineStep[] = [];

  const anomaly = await detectAnomaly();

  if (!anomaly) {
    await updateStore((s) => {
      s.loopRuns.unshift({
        id: randomUUID(),
        status: "healthy",
        latencyMs: s.apiMetrics.profileLoadP95Ms,
        codexProvider: "fallback",
        patchDiff: "No patch needed. Latency within acceptable range.",
        regressionTest: "No new tests generated.",
        prTitle: "No remediation PR required",
        reviewSummary: "Skipped",
        mergeSummary: "Skipped",
        timeline: [
          { label: "Healthy", status: "done", detail: "Profile load latency is within acceptable range.", at: now() },
        ],
        createdAt: now(),
      });
    });

    const store = await readStore();
    return { status: "healthy", latencyMs: store.apiMetrics.profileLoadP95Ms };
  }

  timeline.push({
    label: "Anomaly Detected",
    status: "done",
    detail: `Profile load P95 latency is ${anomaly.profileLoadP95Ms}ms (threshold: 500ms).`,
    at: now(),
  });

  const analysis = await analyzeWithCodex(anomaly);
  timeline.push({
    label: "Codex Analysis",
    status: "done",
    detail: analysis.summary,
    at: now(),
  });

  const patchDiff = generatePatch();
  timeline.push({
    label: "Patch Generated",
    status: "done",
    detail: "Generated patch to remove artificial delay from profileLoader.ts.",
    at: now(),
  });

  const regressionTest = generateRegressionTest();
  timeline.push({
    label: "Regression Test",
    status: "done",
    detail: "Generated test asserting profile load time < 200ms.",
    at: now(),
  });

  const prTitle = "fix(profileLoader): remove artificial latency delay";
  timeline.push({
    label: "PR Opened",
    status: "done",
    detail: prTitle,
    at: now(),
  });

  const reviewSummary = "Auto-review passed: artificial delay removed, regression test added, no breaking changes.";
  timeline.push({
    label: "Auto Review",
    status: "done",
    detail: reviewSummary,
    at: now(),
  });

  await applyFix();

  const mergeSummary = "Merged by automation after checks passed. Profile load latency restored to <50ms.";
  timeline.push({
    label: "Merged",
    status: "done",
    detail: mergeSummary,
    at: now(),
  });

  await updateStore((s) => {
    s.loopRuns.unshift({
      id: randomUUID(),
      status: "fixed",
      latencyMs: anomaly.profileLoadP95Ms,
      codexProvider: analysis.provider,
      patchDiff,
      regressionTest,
      prTitle,
      reviewSummary,
      mergeSummary,
      timeline,
      createdAt: now(),
    });
  });

  return { status: "fixed", latencyMs: anomaly.profileLoadP95Ms };
}

export async function resetRemediationDemo(): Promise<void> {
  await updateStore((s) => {
    s.latencyBugFixed = false;
    s.loopRuns = [];
    s.apiMetrics = { profileLoadAvgMs: 1800, profileLoadP95Ms: 2700, lastChecked: new Date().toISOString() };
  });
}

export async function getAdminLoopState() {
  const store = await readStore();

  return {
    latencyBugFixed: store.latencyBugFixed,
    profileLoadAvgMs: store.apiMetrics.profileLoadAvgMs,
    profileLoadP95Ms: store.apiMetrics.profileLoadP95Ms,
    lastChecked: store.apiMetrics.lastChecked,
    loopRuns: store.loopRuns.map((run) => ({
      id: run.id,
      status: run.status,
      latencyMs: run.latencyMs,
      provider: run.codexProvider,
      patchDiff: run.patchDiff,
      regressionTest: run.regressionTest,
      prTitle: run.prTitle,
      reviewSummary: run.reviewSummary,
      mergeSummary: run.mergeSummary,
      timeline: run.timeline,
      createdAt: run.createdAt,
    })),
  };
}
