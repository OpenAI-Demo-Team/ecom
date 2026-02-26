import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSessionForUser, SESSION_COOKIE_NAME } from "@/src/backend/auth/session";
import { readStore, resetStore, type PersistedLoopRun } from "@/src/backend/db/store";
import { GET as getApiHealth } from "@/app/api/health/apis/route";
import { POST as runLoop } from "@/app/api/loop/run/route";

const ENV_KEYS_TO_CLEAR = [
  "OPENAI_API_KEY",
  "JIRA_BASE_URL",
  "JIRA_EMAIL",
  "JIRA_API_TOKEN",
  "JIRA_PROJECT_KEY",
  "JIRA_BOARD_ID",
  "JIRA_BOARD_URL",
  "DEVSPACE_INCIDENT_GITHUB_TOKEN",
  "INCIDENT_GITHUB_TOKEN",
  "DEVSPACE_DEFAULT_GITHUB_TOKEN",
  "GITHUB_TOKEN",
  "INCIDENT_GITHUB_REPO_OWNER",
  "INCIDENT_GITHUB_REPO_NAME",
  "INCIDENT_GITHUB_REPO",
  "GITHUB_REPO",
  "GITHUB_REPO_OWNER",
  "GITHUB_REPO_NAME",
  "INCIDENT_GITHUB_BASE_BRANCH",
  "INCIDENT_GITHUB_BRANCH_PREFIX",
  "GITHUB_BASE_BRANCH",
  "GITHUB_BRANCH_PREFIX",
  "INCIDENT_AUTO_MERGE",
] as const;

type HealthPayload = {
  apis: Array<{
    id: string;
    status: "healthy" | "degraded";
    prUrl?: string;
  }>;
};

function makeAdminRequest(url: string): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      cookie: "",
    },
  });
}

function makeLoopRun(status: PersistedLoopRun["status"]): PersistedLoopRun {
  const now = new Date().toISOString();
  return {
    id: `run-${status}`,
    status,
    latencyMs: status === "fixed" ? 95 : 980,
    codexProvider: "fallback",
    patchDiff: "diff --git a/file b/file",
    regressionTest: "test",
    prTitle: "fix(diagnostics): demo",
    reviewSummary: "summary",
    mergeSummary: status === "fixed" ? "Merged" : "Waiting for manual merge.",
    githubPrUrl: "https://github.com/OpenAI-Demo-Team/ecom/pull/123",
    githubReviewCommentUrl: "https://github.com/OpenAI-Demo-Team/ecom/pull/123#issuecomment-1",
    timeline: [],
    createdAt: now,
  };
}

describe("admin remediation routes", () => {
  let tempDir = "";
  const previousEnv: Record<string, string | undefined> = {};

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "devspace-admin-routes-"));
    process.env.STORE_PATH = path.join(tempDir, "store.json");
    for (const key of ENV_KEYS_TO_CLEAR) {
      previousEnv[key] = process.env[key];
      delete process.env[key];
    }
    await resetStore();
  });

  afterEach(async () => {
    delete process.env.STORE_PATH;
    for (const key of ENV_KEYS_TO_CLEAR) {
      const value = previousEnv[key];
      if (typeof value === "string") process.env[key] = value;
      else delete process.env[key];
      delete previousEnv[key];
    }
    await rm(tempDir, { recursive: true, force: true });
  });

  it("rejects unauthenticated remediation requests", async () => {
    const request = makeAdminRequest("http://localhost/api/loop/run");
    const response = await runLoop(request);
    expect(response.status).toBe(401);
  });

  it("returns pending status and keeps diagnostics degraded until merge", async () => {
    const token = await createSessionForUser("u-admin");
    const request = new NextRequest("http://localhost/api/loop/run", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });

    const response = await runLoop(request);
    expect(response.status).toBe(200);

    const payload = (await response.json()) as { status: string; run?: { status?: string } };
    expect(payload.status).toBe("pending");
    expect(payload.run?.status).toBe("pending");

    const store = await readStore();
    expect(store.latencyBugFixed).toBe(false);
    expect(store.loopRuns[0]?.status).toBe("pending");
  });

  it("reports diagnostics as degraded when latest run is pending", async () => {
    await resetStore({
      latencyBugFixed: true,
      apiMetrics: {
        profileLoadAvgMs: 45,
        profileLoadP95Ms: 95,
        lastChecked: new Date().toISOString(),
      },
      loopRuns: [makeLoopRun("pending")],
    });

    const response = await getApiHealth();
    const payload = (await response.json()) as HealthPayload;
    const diagnostics = payload.apis.find((api) => api.id === "diagnostics");

    expect(diagnostics).toBeDefined();
    expect(diagnostics?.status).toBe("degraded");
    expect(diagnostics?.prUrl).toContain("/pull/");
  });

  it("reports diagnostics as healthy only when fixed with no pending remediation", async () => {
    await resetStore({
      latencyBugFixed: true,
      apiMetrics: {
        profileLoadAvgMs: 45,
        profileLoadP95Ms: 95,
        lastChecked: new Date().toISOString(),
      },
      loopRuns: [makeLoopRun("fixed")],
    });

    const response = await getApiHealth();
    const payload = (await response.json()) as HealthPayload;
    const diagnostics = payload.apis.find((api) => api.id === "diagnostics");

    expect(diagnostics).toBeDefined();
    expect(diagnostics?.status).toBe("healthy");
  });
});
