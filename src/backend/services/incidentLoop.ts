import { randomUUID } from "node:crypto";
import { readStore, updateStore, type PersistedErrorLog, type PersistedTimelineStep } from "../db/store";
import { analyzeCheckoutIncidentWithCodex } from "./codexSdkClient";
import { monitorCheckoutErrorRate } from "../workers/checkoutMonitorWorker";
import type { CodexResponse } from "../types/codex";
import type { ErrorLog } from "../types/domain";

function toDomainLog(log: PersistedErrorLog): ErrorLog {
  return {
    id: log.id,
    area: log.area,
    message: log.message,
    metadata: log.metadata,
    createdAt: new Date(log.createdAt)
  };
}

function timelineFromCodex(codex: CodexResponse): PersistedTimelineStep[] {
  const now = Date.now();
  return [
    {
      label: "Detected",
      status: "done",
      detail: "Checkout failure rate exceeded 2% due to promo mismatch.",
      at: new Date(now).toISOString()
    },
    {
      label: "Codex Analysis",
      status: "done",
      detail: codex.jiraPayload.rootCause,
      at: new Date(now + 1_000).toISOString()
    },
    {
      label: "PR Opened",
      status: "done",
      detail: codex.prTitle,
      at: new Date(now + 2_000).toISOString()
    },
    {
      label: "Auto Review",
      status: "done",
      detail: codex.autoReviewSummary,
      at: new Date(now + 3_000).toISOString()
    },
    {
      label: "Merged",
      status: "done",
      detail: codex.mergeSummary,
      at: new Date(now + 4_000).toISOString()
    }
  ];
}

export async function runCodexPromoRemediationLoop(): Promise<{
  status: "healthy" | "fixed";
  errorRate: number;
}> {
  await updateStore((store) => {
    store.checkoutMetrics.totalCheckouts += 100;

    if (!store.promoBugFixed) {
      store.checkoutMetrics.failedCheckouts += 3;
      const now = new Date().toISOString();
      store.errorLogs.push(
        {
          id: randomUUID(),
          area: "CHECKOUT",
          message: "AGENT10 promo total mismatch: discount applied twice",
          metadata: { source: "checkout-simulation", promoCode: "AGENT10" },
          createdAt: now
        },
        {
          id: randomUUID(),
          area: "CHECKOUT",
          message: "Checkout total below expected floor after promo",
          metadata: { source: "checkout-simulation", promoCode: "AGENT10" },
          createdAt: now
        }
      );
    }
  });

  const metricsRepo = {
    getCheckoutMetrics: async () => {
      const store = await readStore();
      return store.checkoutMetrics;
    }
  };

  const errorLogRepo = {
    getLatest: async (limit: number) => {
      const store = await readStore();
      return store.errorLogs.slice(-limit).map(toDomainLog);
    }
  };

  const result = await monitorCheckoutErrorRate(metricsRepo, errorLogRepo, {
    analyzeCheckoutIncident: analyzeCheckoutIncidentWithCodex
  });

  if (result.status === "healthy") {
    await updateStore((store) => {
      store.loopRuns.unshift({
        id: randomUUID(),
        status: "healthy",
        errorRate: result.errorRate,
        codexProvider: "fallback",
        patchDiff: "No patch needed. Error rate below threshold.",
        regressionTest: "No new tests generated.",
        prTitle: "No remediation PR required",
        reviewSummary: "Skipped",
        mergeSummary: "Skipped",
        timeline: [
          {
            label: "Healthy",
            status: "done",
            detail: "No incident triggered.",
            at: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString()
      });
    });

    return {
      status: "healthy",
      errorRate: result.errorRate
    };
  }

  await updateStore((store) => {
    store.promoBugFixed = true;
    store.loopRuns.unshift({
      id: randomUUID(),
      status: "fixed",
      errorRate: result.errorRate,
      codexProvider: result.codexResponse.provider,
      patchDiff: result.codexResponse.patchDiff,
      regressionTest: result.codexResponse.testFile,
      prTitle: result.codexResponse.prTitle,
      reviewSummary: result.codexResponse.autoReviewSummary,
      mergeSummary: result.codexResponse.mergeSummary,
      timeline: timelineFromCodex(result.codexResponse),
      createdAt: new Date().toISOString()
    });
  });

  return {
    status: "fixed",
    errorRate: result.errorRate
  };
}

export async function resetRemediationDemo(): Promise<void> {
  await updateStore((store) => {
    store.promoBugFixed = false;
    store.loopRuns = [];
    store.checkoutMetrics = { totalCheckouts: 0, failedCheckouts: 0 };
    store.errorLogs = [];
  });
}

export async function getAdminLoopState(): Promise<{
  promoBugFixed: boolean;
  totalCheckouts: number;
  failedCheckouts: number;
  errorRate: number;
  loopRuns: Array<{
    id: string;
    status: "healthy" | "fixed";
    errorRate: number;
    provider: "openai-codex" | "fallback";
    patchDiff: string;
    prTitle: string;
    reviewSummary: string;
    mergeSummary: string;
    timeline: PersistedTimelineStep[];
    createdAt: string;
  }>;
}> {
  const store = await readStore();
  const errorRate =
    store.checkoutMetrics.totalCheckouts === 0
      ? 0
      : store.checkoutMetrics.failedCheckouts / store.checkoutMetrics.totalCheckouts;

  return {
    promoBugFixed: store.promoBugFixed,
    totalCheckouts: store.checkoutMetrics.totalCheckouts,
    failedCheckouts: store.checkoutMetrics.failedCheckouts,
    errorRate,
    loopRuns: store.loopRuns.map((run) => ({
      id: run.id,
      status: run.status,
      errorRate: run.errorRate,
      provider: run.codexProvider,
      patchDiff: run.patchDiff,
      prTitle: run.prTitle,
      reviewSummary: run.reviewSummary,
      mergeSummary: run.mergeSummary,
      timeline: run.timeline,
      createdAt: run.createdAt
    }))
  };
}
