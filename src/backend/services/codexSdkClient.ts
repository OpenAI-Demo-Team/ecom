import OpenAI from "openai";

type ReasoningEffort = "low" | "medium" | "high";

const DEFAULT_CODEX_MODEL = "gpt-5.3-codex";
const STRONG_FALLBACK_CODEX_MODEL = "gpt-5.1-codex";
const FAST_FALLBACK_CODEX_MODEL = "gpt-5.1-codex-mini";

function getCodexModel(): string {
  const configured = (process.env.CODEX_MODEL ?? DEFAULT_CODEX_MODEL).trim();
  return /codex/i.test(configured) ? configured : DEFAULT_CODEX_MODEL;
}

function readEnvInt(name: string, defaultValue: number, min: number, max: number): number {
  const raw = Number(process.env[name] ?? defaultValue);
  if (!Number.isFinite(raw)) return defaultValue;
  return Math.min(max, Math.max(min, Math.round(raw)));
}

function readReasoningEffort(name: string, defaultValue: ReasoningEffort): ReasoningEffort {
  const raw = String(process.env[name] ?? defaultValue).trim().toLowerCase();
  if (raw === "low" || raw === "medium" || raw === "high") return raw;
  return defaultValue;
}

type LatencyMetrics = {
  profileLoadAvgMs: number;
  profileLoadP95Ms: number;
  lastChecked: string;
};

type LatencyAnalysis = {
  provider: "openai-codex" | "fallback";
  summary: string;
  rootCause: string;
  recommendation: string;
};

const fallbackAnalysis: Omit<LatencyAnalysis, "provider"> = {
  summary:
    "Detected artificial delay in app/api/internal/diagnostics/route.ts. The endpoint contains a hardcoded setTimeout when latencyBugFixed is false. Recommendation: remove the artificial delay branch.",
  rootCause:
    "The diagnostics API includes a conditional artificial delay that executes while latencyBugFixed is false.",
  recommendation:
    "Remove the artificial delay block and set latencyBugFixed to true after remediation validation.",
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

export async function analyzeLatencyIssue(metrics: LatencyMetrics): Promise<LatencyAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ...fallbackAnalysis, provider: "fallback" };

  const prompt = [
    "You are an SRE AI analyzing a latency spike in a profile loading service.",
    "Return a JSON object with keys: summary, rootCause, recommendation.",
    "Metrics:",
    JSON.stringify(metrics, null, 2),
    "Context: app/api/internal/diagnostics/route.ts may contain an artificial delay branch.",
  ].join("\n");

  try {
    const timeoutMs = readEnvInt("CODEX_TIMEOUT_MS", 45_000, 10_000, 180_000);
    const client = new OpenAI({ apiKey, timeout: timeoutMs, maxRetries: 0 });
    const configuredModel = getCodexModel();
    const models = Array.from(new Set([configuredModel, STRONG_FALLBACK_CODEX_MODEL, FAST_FALLBACK_CODEX_MODEL]));
    const effort = readReasoningEffort("CODEX_REASONING_EFFORT", "medium");
    let text = "";

    for (const model of models) {
      try {
        const payload = await client.responses.create({
          model,
          reasoning: { effort: model === configuredModel ? effort : "low" },
          input: prompt,
        });
        text = extractOutputText(payload);
        if (text.trim()) break;
      } catch {
        // Try next Codex variant before falling back.
      }
    }
    if (!text.trim()) return { ...fallbackAnalysis, provider: "fallback" };

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return { ...fallbackAnalysis, provider: "fallback" };
    }

    const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    if (
      typeof parsed.summary === "string" &&
      typeof parsed.rootCause === "string" &&
      typeof parsed.recommendation === "string"
    ) {
      return {
        provider: "openai-codex",
        summary: parsed.summary,
        rootCause: parsed.rootCause,
        recommendation: parsed.recommendation,
      };
    }

    return { ...fallbackAnalysis, provider: "fallback" };
  } catch {
    return { ...fallbackAnalysis, provider: "fallback" };
  }
}

export function generateRegressionTest(): string {
  return `import { loadProfile } from "./profileLoader";

it("loads profile within 200ms when latency bug is fixed", async () => {
  const start = Date.now();
  const profile = await loadProfile("jack");
  const elapsed = Date.now() - start;
  expect(profile).not.toBeNull();
  expect(elapsed).toBeLessThan(200);
});`;
}

export async function generateCodexReviewComment(input: {
  issueSummary: string;
  patchDiff: string;
  jiraIssueKey?: string;
}): Promise<{ provider: "openai-codex" | "fallback"; comment: string }> {
  const fallback = {
    provider: "fallback" as const,
    comment: [
      "Codex Auto-Review",
      "- Scope is isolated to `/api/internal/diagnostics`.",
      "- Change removes artificial delay and restores sub-200ms latency target.",
      "- No user-facing API behavior changes expected.",
      input.jiraIssueKey ? `- Linked Jira: ${input.jiraIssueKey}` : "- Jira link not provided.",
      "- Recommendation: merge after CI passes.",
    ].join("\n"),
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

  try {
    const timeoutMs = readEnvInt("CODEX_TIMEOUT_MS", 45_000, 10_000, 180_000);
    const client = new OpenAI({ apiKey, timeout: timeoutMs, maxRetries: 0 });
    const configuredModel = getCodexModel();
    const models = Array.from(new Set([configuredModel, STRONG_FALLBACK_CODEX_MODEL, FAST_FALLBACK_CODEX_MODEL]));
    const effort = readReasoningEffort("CODEX_REASONING_EFFORT", "medium");
    let text = "";

    for (const model of models) {
      try {
        const response = await client.responses.create({
          model,
          reasoning: { effort: model === configuredModel ? effort : "low" },
          max_output_tokens: 500,
          input: [
            {
              role: "system",
              content:
                "You are Codex reviewer. Return a concise GitHub PR review comment as plain text with 4-6 bullet points.",
            },
            {
              role: "user",
              content: [
                `Issue summary: ${input.issueSummary}`,
                input.jiraIssueKey ? `Jira key: ${input.jiraIssueKey}` : "",
                "Patch diff:",
                input.patchDiff.slice(0, 3500),
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        });

        text = extractOutputText(response).trim();
        if (text) break;
      } catch {
        // Try next model variant.
      }
    }

    if (!text) return fallback;
    return {
      provider: "openai-codex",
      comment: text.slice(0, 1800),
    };
  } catch {
    return fallback;
  }
}
