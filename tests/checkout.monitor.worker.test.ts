import { describe, expect, it } from "vitest";
import {
  monitorCheckoutErrorRate,
  type CodexClient,
  type ErrorLogRepo,
  type MetricsRepo
} from "../src/backend/workers/checkoutMonitorWorker";
import { fallbackCodexResponse } from "../src/backend/services/codexSdkClient";
import type { ErrorLog } from "../src/backend/types/domain";

function makeLog(message: string): ErrorLog {
  return {
    id: `log-${message}`,
    area: "CHECKOUT",
    message,
    metadata: { source: "test" },
    createdAt: new Date("2026-02-01T00:00:00.000Z")
  };
}

describe("checkout monitor", () => {
  it("returns healthy status at or below threshold", async () => {
    const metricsRepo: MetricsRepo = {
      getCheckoutMetrics: async () => ({ totalCheckouts: 200, failedCheckouts: 4 })
    };
    const errorLogRepo: ErrorLogRepo = {
      getLatest: async () => [makeLog("unused")]
    };
    const codexClient: CodexClient = {
      analyzeCheckoutIncident: async () => fallbackCodexResponse
    };

    const result = await monitorCheckoutErrorRate(metricsRepo, errorLogRepo, codexClient);
    expect(result.status).toBe("healthy");
  });

  it("returns codex response when threshold is exceeded", async () => {
    const metricsRepo: MetricsRepo = {
      getCheckoutMetrics: async () => ({ totalCheckouts: 100, failedCheckouts: 3 })
    };
    const errorLogRepo: ErrorLogRepo = {
      getLatest: async () => [makeLog("promo mismatch"), makeLog("unexpected total")]
    };
    const codexClient: CodexClient = {
      analyzeCheckoutIncident: async ({ errorLogs, codeContext }) => {
        expect(errorLogs.length).toBe(2);
        expect(codeContext.length).toBeGreaterThan(0);
        return fallbackCodexResponse;
      }
    };

    const result = await monitorCheckoutErrorRate(metricsRepo, errorLogRepo, codexClient);
    expect(result.status).toBe("alert");
    if (result.status === "alert") {
      expect(result.codexResponse.prTitle).toContain("promo");
    }
  });
});
