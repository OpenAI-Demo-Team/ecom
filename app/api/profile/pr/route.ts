import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, getUserFromSessionToken } from "../../../../src/backend/auth/session";
import { readStore } from "../../../../src/backend/db/store";
import { generateProfilePrDraft } from "../../../../src/backend/services/profilePrService";
import { createGitHubProfilePullRequest } from "../../../../src/backend/services/githubPrService";

type ThemeSnapshot = {
  prompt: string;
  html: string;
  css: string;
};

function readText(value: unknown, max = 1200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function readBlob(value: unknown, max = 120_000): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function readSnapshot(value: unknown): ThemeSnapshot {
  const rec = (value ?? {}) as Record<string, unknown>;
  return {
    prompt: readText(rec.prompt, 1200),
    html: readBlob(rec.html, 120_000),
    css: readBlob(rec.css, 120_000),
  };
}

export async function POST(request: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(token ?? null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const store = await readStore();
  const profile = store.profiles.find((p) => p.userId === user.id);
  if (!profile) {
    return NextResponse.json({ error: "No profile found for user" }, { status: 404 });
  }

  const base = readSnapshot(body.base);
  const head = readSnapshot(body.head);
  if (!head.prompt || !head.html || !head.css) {
    return NextResponse.json({ error: "head snapshot is required" }, { status: 400 });
  }

  const fallbackBase: ThemeSnapshot = {
    prompt: base.prompt || profile.vibePrompt,
    html: base.html || profile.generatedHtml,
    css: base.css || profile.generatedCss,
  };

  const draft = await generateProfilePrDraft({
    username: profile.username,
    displayName: profile.displayName,
    base: fallbackBase,
    head,
  });

  const openOnGitHub = body.openOnGitHub !== false;
  const repoOwnerRaw = (process.env.GITHUB_REPO_OWNER ?? "").trim();
  const repoNameRaw = (process.env.GITHUB_REPO_NAME ?? "").trim();
  const repoCombined = (process.env.GITHUB_REPO ?? "").trim();
  const [combinedOwner, combinedName] =
    !repoOwnerRaw && !repoNameRaw && repoCombined.includes("/")
      ? repoCombined.split("/", 2)
      : ["", ""];
  const repoOwner = repoOwnerRaw || combinedOwner;
  const repoName = repoNameRaw || combinedName;
  const baseBranch = (process.env.GITHUB_BASE_BRANCH ?? "main").trim();
  const branchPrefix = (process.env.GITHUB_BRANCH_PREFIX ?? "").trim().replace(/^\/+|\/+$/g, "");
  const persistedUser = store.users.find((u) => u.id === user.id);
  const githubToken = (
    persistedUser?.githubToken ??
    process.env.DEVSPACE_DEFAULT_GITHUB_TOKEN ??
    process.env.GITHUB_TOKEN ??
    ""
  ).trim();

  let github: { status: "created" | "skipped" | "failed"; url?: string; message: string } = {
    status: "skipped",
    message: "GitHub PR not requested.",
  };

  if (openOnGitHub) {
    if (!githubToken) {
      github = { status: "skipped", message: "No GitHub token configured for this user." };
    } else if (!repoOwner || !repoName) {
      github = { status: "skipped", message: "Set GITHUB_REPO_OWNER and GITHUB_REPO_NAME to enable PR creation." };
    } else {
      try {
        const created = await createGitHubProfilePullRequest({
          token: githubToken,
          owner: repoOwner,
          repo: repoName,
          baseBranch,
          branchName: branchPrefix ? `${branchPrefix}/${draft.branchName}` : draft.branchName,
          title: draft.title,
          body: `${draft.body}\n\n### Theme Patch\n\`\`\`diff\n${draft.diff.slice(0, 14_000)}\n\`\`\``,
          username: profile.username,
          displayName: profile.displayName,
          head,
        });
        github = {
          status: "created",
          url: created.url,
          message: `Created PR #${created.number} on ${repoOwner}/${repoName}.`,
        };
      } catch (err) {
        github = {
          status: "failed",
          message: err instanceof Error ? err.message : "Failed to create GitHub pull request.",
        };
      }
    }
  }

  return NextResponse.json({
    ...draft,
    github,
  });
}
