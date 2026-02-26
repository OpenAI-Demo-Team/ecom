import type { CodexIncidentInput, CodexResponse } from "../types/codex";

const DEFAULT_MODEL = process.env.CODEX_MODEL ?? "gpt-5-codex";

export const fallbackCodexResponse: CodexResponse = {
  provider: "fallback",
  patchDiff:
    "diff --git a/src/backend/services/checkout.ts b/src/backend/services/checkout.ts\n@@\n-  return subtotal - discount - discount;\n+  return subtotal - discount;\n",
  testFile:
    'it("applies promo discount once", () => {\\n  const total = calculateCartTotalFixed([{ sku: "agent-support-pro", qty: 1, unitPriceCents: 9900 }], { code: "AGENT10", percentOff: 10 });\\n  expect(total).toBe(8910);\\n});',
  jiraPayload: {
    title: "AgentMarket checkout total incorrect with AGENT10",
    description: "Checkout failures crossed threshold due to promo double-discount bug.",
    rootCause: "Promo discount is subtracted twice in calculateCartTotal.",
    reproductionSteps: [
      "Login as buyer@agentmarket.demo",
      "Add an agent and apply AGENT10",
      "Observe total is lower than expected because discount is applied twice"
    ],
    suggestedPatch: "Use subtotal - discount instead of subtracting discount twice.",
    testSummary: "Add regression test asserting AGENT10 is applied exactly once."
  },
  prTitle: "fix(checkout): apply AGENT10 promo discount once",
  prBody:
    "This PR fixes the checkout calculation bug where promo discounts were deducted twice and adds a regression test.",
  autoReviewSummary: "Auto-review passed: no breaking API changes, test coverage improved.",
  mergeSummary: "Merged by automation after checks passed. Checkout totals now match expected promo math."
};

function extractOutputText(payload: unknown): string {
  const data = payload as Record<string, unknown>;
  if (typeof data.output_text === "string") return data.output_text;

  const output = Array.isArray(data.output) ? data.output : [];
  const chunks: string[] = [];

  for (const item of output) {
    const itemRecord = item as Record<string, unknown>;
    const content = Array.isArray(itemRecord.content) ? itemRecord.content : [];
    for (const part of content) {
      const partRecord = part as Record<string, unknown>;
      if (typeof partRecord.text === "string") chunks.push(partRecord.text);
    }
  }

  return chunks.join("\n");
}

function tryParseCodexResponse(text: string): Omit<CodexResponse, "provider"> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as Omit<CodexResponse, "provider">;
    if (
      typeof parsed.patchDiff === "string" &&
      typeof parsed.testFile === "string" &&
      typeof parsed.prTitle === "string" &&
      typeof parsed.prBody === "string" &&
      typeof parsed.autoReviewSummary === "string" &&
      typeof parsed.mergeSummary === "string" &&
      typeof parsed.jiraPayload?.title === "string"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export async function analyzeCheckoutIncidentWithCodex(input: CodexIncidentInput): Promise<CodexResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackCodexResponse;

  const prompt = [
    "You are Codex triaging a checkout production incident in AgentMarket.",
    "Return strict JSON only with keys:",
    "patchDiff, testFile, jiraPayload{title,description,rootCause,reproductionSteps,suggestedPatch,testSummary},",
    "prTitle, prBody, autoReviewSummary, mergeSummary.",
    "Incident logs:",
    JSON.stringify(input.errorLogs, null, 2),
    "Code context:",
    JSON.stringify(
      input.codeContext.map((entry) => ({ file: entry.file, content: entry.content.slice(0, 3000) })),
      null,
      2
    )
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0,
        input: prompt
      })
    });

    if (!response.ok) return fallbackCodexResponse;

    const payload = await response.json();
    const text = extractOutputText(payload);
    const parsed = tryParseCodexResponse(text);
    if (!parsed) return fallbackCodexResponse;

    return {
      ...parsed,
      provider: "openai-codex"
    };
  } catch {
    return fallbackCodexResponse;
  }
}
