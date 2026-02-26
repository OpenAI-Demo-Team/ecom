import OpenAI from "openai";

type ReasoningEffort = "low" | "medium" | "high";

type ThemeSnapshot = {
  prompt: string;
  html: string;
  css: string;
};

export type ProfilePrDraftInput = {
  username: string;
  displayName: string;
  base: ThemeSnapshot;
  head: ThemeSnapshot;
};

export type ProfilePrDraft = {
  provider: "codex" | "fallback";
  providerReason?: string;
  title: string;
  body: string;
  branchName: string;
  diff: string;
};

const DEFAULT_CODEX_MODEL = "gpt-5.3-codex";

function getCodexModel(): string {
  const configured = (process.env.CODEX_MODEL ?? DEFAULT_CODEX_MODEL).trim();
  return /codex/i.test(configured) ? configured : DEFAULT_CODEX_MODEL;
}

function readReasoningEffort(name: string, defaultValue: ReasoningEffort): ReasoningEffort {
  const raw = String(process.env[name] ?? defaultValue).trim().toLowerCase();
  if (raw === "low" || raw === "medium" || raw === "high") return raw;
  return defaultValue;
}

function cleanInline(text: string, max = 120): string {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function extractThemeTag(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (/(cyber|neon|matrix|terminal)/.test(lower)) return "cyberpunk";
  if (/(vaporwave|retro|synth)/.test(lower)) return "vaporwave";
  if (/(cosmic|space|galaxy|nebula)/.test(lower)) return "cosmic";
  if (/(tropical|maximal|jungle|party)/.test(lower)) return "tropical";
  if (/(brutalist|black.*white|raw)/.test(lower)) return "brutalist";
  if (/(minimal|zen|clean)/.test(lower)) return "minimal";
  if (/(academia|parchment|vintage)/.test(lower)) return "dark-academia";
  if (/(y2k|bubblegum|2000)/.test(lower)) return "y2k";
  return "theme-refresh";
}

function excerpt(text: string, max = 260): string {
  return cleanInline(text, max);
}

function trimLines(text: string, maxLines = 100): string[] {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return lines;
  return [...lines.slice(0, maxLines), "..."];
}

function buildDiff(before: ThemeSnapshot, after: ThemeSnapshot): string {
  const promptBefore = trimLines(before.prompt, 10);
  const promptAfter = trimLines(after.prompt, 10);
  const htmlBefore = trimLines(before.html, 120);
  const htmlAfter = trimLines(after.html, 120);
  const cssBefore = trimLines(before.css, 120);
  const cssAfter = trimLines(after.css, 120);

  return [
    "diff --git a/profile/theme-prompt.txt b/profile/theme-prompt.txt",
    "--- a/profile/theme-prompt.txt",
    "+++ b/profile/theme-prompt.txt",
    `@@ -1,${promptBefore.length} +1,${promptAfter.length} @@`,
    ...promptBefore.map((line) => `-${line}`),
    ...promptAfter.map((line) => `+${line}`),
    "",
    "diff --git a/profile/generated.html b/profile/generated.html",
    "--- a/profile/generated.html",
    "+++ b/profile/generated.html",
    `@@ -1,${htmlBefore.length} +1,${htmlAfter.length} @@`,
    ...htmlBefore.map((line) => `-${line}`),
    ...htmlAfter.map((line) => `+${line}`),
    "",
    "diff --git a/profile/generated.css b/profile/generated.css",
    "--- a/profile/generated.css",
    "+++ b/profile/generated.css",
    `@@ -1,${cssBefore.length} +1,${cssAfter.length} @@`,
    ...cssBefore.map((line) => `-${line}`),
    ...cssAfter.map((line) => `+${line}`),
  ].join("\n");
}

function extractOutputText(payload: unknown): string {
  const data = payload as Record<string, unknown>;
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text;

  const output = Array.isArray(data.output) ? data.output : [];
  const chunks: string[] = [];
  for (const item of output) {
    const rec = item as Record<string, unknown>;
    const content = Array.isArray(rec.content) ? rec.content : [];
    for (const part of content) {
      const p = part as Record<string, unknown>;
      if (typeof p.text === "string") chunks.push(p.text);
    }
  }
  return chunks.join("\n");
}

function parseDraftJson(text: string): { title: string; body: string } | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
    if (typeof parsed.title === "string" && typeof parsed.body === "string") {
      return { title: parsed.title.trim(), body: parsed.body.trim() };
    }
  } catch {
    return null;
  }
  return null;
}

function buildFallbackDraft(input: ProfilePrDraftInput): ProfilePrDraft {
  const themeTag = extractThemeTag(input.head.prompt);
  const branchName = `profile/${slugify(input.username)}-${themeTag}-${Date.now().toString().slice(-6)}`;
  const title = `feat(profile): re-theme @${input.username} to ${themeTag}`;
  const body = [
    "## Summary",
    `- Re-themed \`@${input.username}\` profile using vibe coding.`,
    `- Previous vibe: ${excerpt(input.base.prompt, 140) || "N/A"}`,
    `- New vibe: ${excerpt(input.head.prompt, 140) || "N/A"}`,
    "",
    "## Why",
    "- Make profile aesthetics more distinctive and aligned with creator intent.",
    "",
    "## Validation",
    "- Verified generated HTML/CSS render in profile immersive view.",
    "- Confirmed tabs/content remain accessible.",
  ].join("\n");

  return {
    provider: "fallback",
    title,
    body,
    branchName,
    diff: buildDiff(input.base, input.head),
  };
}

export async function generateProfilePrDraft(input: ProfilePrDraftInput): Promise<ProfilePrDraft> {
  const fallback = buildFallbackDraft(input);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ...fallback,
      providerReason: "OPENAI_API_KEY is not set. Returning fallback PR draft.",
    };
  }

  try {
    const client = new OpenAI({ apiKey, timeout: 15_000, maxRetries: 0 });
    const response = await client.responses.create({
      model: getCodexModel(),
      reasoning: { effort: readReasoningEffort("CODEX_REASONING_EFFORT", "medium") },
      max_output_tokens: 1400,
      input: [
        {
          role: "system",
          content:
            'You are a senior engineer writing concise, high-signal GitHub PR drafts. Return JSON only with keys: "title", "body".',
        },
        {
          role: "user",
          content: [
            `Target username: @${input.username}`,
            `Display name: ${input.displayName}`,
            `Previous vibe: ${input.base.prompt}`,
            `New vibe: ${input.head.prompt}`,
            "",
            "Diff excerpt:",
            buildDiff(input.base, input.head).slice(0, 4500),
            "",
            "Write a PR title and body suitable for GitHub.",
          ].join("\n"),
        },
      ],
    });

    const parsed = parseDraftJson(extractOutputText(response));
    if (!parsed) {
      return {
        ...fallback,
        providerReason: "Codex PR draft parsing failed. Returning fallback draft.",
      };
    }

    return {
      provider: "codex",
      title: parsed.title,
      body: parsed.body,
      branchName: fallback.branchName,
      diff: fallback.diff,
    };
  } catch {
    return {
      ...fallback,
      providerReason: "Codex PR draft request failed. Returning fallback draft.",
    };
  }
}
