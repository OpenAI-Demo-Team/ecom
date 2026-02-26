import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readStore, resetStore } from "@/src/backend/db/store";
import { getAdminLoopState, runSelfHealingLoop } from "@/src/backend/services/incidentLoop";
import { loadProfile } from "@/src/backend/services/profileLoader";

describe("codex self-healing loop (latency)", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "devspace-loop-"));
    process.env.STORE_PATH = path.join(tempDir, "store.json");
    await resetStore();
  });

  afterEach(async () => {
    delete process.env.STORE_PATH;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("detectAnomaly triggers when p95 latency > 500ms", async () => {
    await resetStore({
      apiMetrics: {
        profileLoadAvgMs: 1800,
        profileLoadP95Ms: 2700,
        lastChecked: new Date().toISOString(),
      },
    });

    const result = await runSelfHealingLoop();
    expect(result.status).toBe("fixed");
    expect(result.latencyMs).toBeGreaterThan(500);
  });

  it("full self-healing loop sets latencyBugFixed to true", async () => {
    await resetStore({
      apiMetrics: {
        profileLoadAvgMs: 1800,
        profileLoadP95Ms: 2700,
        lastChecked: new Date().toISOString(),
      },
    });

    const result = await runSelfHealingLoop();
    expect(result.status).toBe("fixed");

    const state = await getAdminLoopState();
    expect(state.latencyBugFixed).toBe(true);
    expect(state.loopRuns.length).toBeGreaterThanOrEqual(1);
    expect(state.loopRuns[0]?.timeline.some((item) => item.label === "Merged")).toBe(true);

    const store = await readStore();
    expect(store.latencyBugFixed).toBe(true);
    expect(store.loopRuns[0]?.patchDiff).toContain("profileLoader");
  });

  it("after fix, profile load is fast (no artificial delay)", async () => {
    await resetStore({
      latencyBugFixed: true,
      apiMetrics: {
        profileLoadAvgMs: 45,
        profileLoadP95Ms: 67,
        lastChecked: new Date().toISOString(),
      },
    });

    const start = Date.now();
    const profile = await loadProfile("jack");
    const elapsed = Date.now() - start;

    expect(profile).not.toBeNull();
    expect(profile!.username).toBe("jack");
    expect(elapsed).toBeLessThan(500);
  });

  it("returns healthy status when latency is within range", async () => {
    await resetStore({
      apiMetrics: {
        profileLoadAvgMs: 45,
        profileLoadP95Ms: 120,
        lastChecked: new Date().toISOString(),
      },
    });

    const result = await runSelfHealingLoop();
    expect(result.status).toBe("healthy");
  });
});
