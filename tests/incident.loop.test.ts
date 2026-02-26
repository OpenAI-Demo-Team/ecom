import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readStore, resetStore } from "../src/backend/db/store";
import { getAdminLoopState, runCodexPromoRemediationLoop } from "../src/backend/services/incidentLoop";

describe("codex remediation loop", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "stackstore-loop-"));
    process.env.STORE_PATH = path.join(tempDir, "store.json");
    await resetStore();
  });

  afterEach(async () => {
    delete process.env.STORE_PATH;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("detects incident, runs codex response, and marks bug as fixed", async () => {
    const result = await runCodexPromoRemediationLoop();
    expect(result.status).toBe("fixed");
    expect(result.errorRate).toBe(0.03);

    const state = await getAdminLoopState();
    expect(state.promoBugFixed).toBe(true);
    expect(state.loopRuns[0]?.timeline.some((item) => item.label === "Merged")).toBe(true);

    const store = await readStore();
    expect(store.loopRuns[0]?.patchDiff).toContain("return subtotal - discount;");
  });

  it("returns healthy status on subsequent run after fix", async () => {
    await runCodexPromoRemediationLoop();
    const second = await runCodexPromoRemediationLoop();
    expect(second.status).toBe("healthy");
  });
});
