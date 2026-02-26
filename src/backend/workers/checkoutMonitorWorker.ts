import { readFile } from "node:fs/promises";
import { fallbackCodexResponse } from "../services/codexSdkClient";
import type { CodexIncidentInput, CodexResponse } from "../types/codex";
import type { ErrorLog } from "../types/domain";

type CheckoutMetrics = {
  totalCheckouts: number;
  failedCheckouts: number;
};

export type MonitorResult =
  | { status: "healthy"; errorRate: number }
  | { status: "alert"; errorRate: number; codexResponse: CodexResponse };

export type ErrorLogRepo = {
  getLatest(limit: number): Promise<ErrorLog[]>;
};

export type MetricsRepo = {
  getCheckoutMetrics(): Promise<CheckoutMetrics>;
};

export type CodexClient = {
  analyzeCheckoutIncident(input: CodexIncidentInput): Promise<CodexResponse>;
};

const RELEVANT_CODE_FILES = ["src/backend/services/checkout.ts", "tests/checkout.calculation.test.ts"];

export async function monitorCheckoutErrorRate(
  metricsRepo: MetricsRepo,
  errorLogRepo: ErrorLogRepo,
  codexClient: CodexClient
): Promise<MonitorResult> {
  const metrics = await metricsRepo.getCheckoutMetrics();
  const errorRate = metrics.totalCheckouts === 0 ? 0 : metrics.failedCheckouts / metrics.totalCheckouts;

  if (errorRate <= 0.02) return { status: "healthy", errorRate };

  const errorLogs = await errorLogRepo.getLatest(20);
  const codeContext = await Promise.all(
    RELEVANT_CODE_FILES.map(async (file) => ({
      file,
      content: await readFile(file, "utf-8")
    }))
  );

  const codexResponse = await codexClient.analyzeCheckoutIncident({ errorLogs, codeContext });

  return {
    status: "alert",
    errorRate,
    codexResponse
  };
}

export const exampleStructuredOutput: CodexResponse = fallbackCodexResponse;
