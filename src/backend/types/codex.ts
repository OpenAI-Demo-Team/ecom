import type { ErrorLog } from "./domain";

export type JiraPayload = {
  title: string;
  description: string;
  rootCause: string;
  reproductionSteps: string[];
  suggestedPatch: string;
  testSummary: string;
};

export type CodexResponse = {
  provider: "openai-codex" | "fallback";
  patchDiff: string;
  testFile: string;
  jiraPayload: JiraPayload;
  prTitle: string;
  prBody: string;
  autoReviewSummary: string;
  mergeSummary: string;
};

export type CodexIncidentInput = {
  errorLogs: ErrorLog[];
  codeContext: Array<{ file: string; content: string }>;
};
