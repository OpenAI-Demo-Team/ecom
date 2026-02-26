type IncidentGitHubConfig = {
  token: string;
  owner: string;
  repo: string;
  baseBranch: string;
  branchPrefix: string;
};

type GitHubPrResult = {
  url: string;
  number: number;
  branchName: string;
};

type GitHubCommentResult = {
  url: string;
};

function parseOwnerRepo(raw: string): { owner: string; repo: string } | null {
  const [owner, repo] = raw.split("/", 2).map((part) => part.trim());
  if (!owner || !repo) return null;
  return { owner, repo };
}

function safeBranchName(name: string): string {
  return name.replace(/[^a-zA-Z0-9/_-]/g, "-").slice(0, 120);
}

function toBase64(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64");
}

async function githubRequest<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`GitHub API ${response.status}: ${text.slice(0, 280)}`);
  }

  return (await response.json()) as T;
}

export function readIncidentGitHubConfig(): IncidentGitHubConfig | null {
  const token = (
    process.env.DEVSPACE_INCIDENT_GITHUB_TOKEN ??
    process.env.INCIDENT_GITHUB_TOKEN ??
    process.env.DEVSPACE_DEFAULT_GITHUB_TOKEN ??
    process.env.GITHUB_TOKEN ??
    ""
  ).trim();

  const owner = (process.env.INCIDENT_GITHUB_REPO_OWNER ?? "").trim();
  const repo = (process.env.INCIDENT_GITHUB_REPO_NAME ?? "").trim();
  const combined = (process.env.INCIDENT_GITHUB_REPO ?? process.env.GITHUB_REPO ?? "").trim();
  const parsed = parseOwnerRepo(combined);

  const finalOwner = owner || parsed?.owner || "";
  const finalRepo = repo || parsed?.repo || "";
  const baseBranch = (process.env.INCIDENT_GITHUB_BASE_BRANCH ?? process.env.GITHUB_BASE_BRANCH ?? "main").trim();
  const branchPrefix =
    (process.env.INCIDENT_GITHUB_BRANCH_PREFIX ?? process.env.GITHUB_BRANCH_PREFIX ?? "feature")
      .trim()
      .replace(/^\/+|\/+$/g, "") || "feature";

  if (!token || !finalOwner || !finalRepo) return null;

  return {
    token,
    owner: finalOwner,
    repo: finalRepo,
    baseBranch,
    branchPrefix,
  };
}

export async function createIncidentPullRequest(input: {
  config: IncidentGitHubConfig;
  title: string;
  body: string;
  filePath: string;
  fileContent: string;
  branchSuffix: string;
}): Promise<GitHubPrResult> {
  const { config } = input;
  const ownerRepo = `${config.owner}/${config.repo}`;

  const baseRef = await githubRequest<{ object: { sha: string } }>(
    config.token,
    `https://api.github.com/repos/${ownerRepo}/git/ref/heads/${encodeURIComponent(config.baseBranch)}`,
  );

  const baseSha = baseRef.object.sha;
  let branchName = safeBranchName(`${config.branchPrefix}/diagnostics-fix-${input.branchSuffix}`);

  try {
    await githubRequest(config.token, `https://api.github.com/repos/${ownerRepo}/git/refs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
    });
  } catch {
    branchName = safeBranchName(`${branchName}-${Date.now().toString().slice(-4)}`);
    await githubRequest(config.token, `https://api.github.com/repos/${ownerRepo}/git/refs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
    });
  }

  await githubRequest(config.token, `https://api.github.com/repos/${ownerRepo}/contents/${encodeURIComponent(input.filePath)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `fix(diagnostics): remove artificial latency (${input.branchSuffix})`,
      content: toBase64(input.fileContent),
      branch: branchName,
    }),
  });

  const pr = await githubRequest<{ html_url: string; number: number }>(
    config.token,
    `https://api.github.com/repos/${ownerRepo}/pulls`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: input.title,
        head: branchName,
        base: config.baseBranch,
        body: input.body,
      }),
    },
  );

  return {
    url: pr.html_url,
    number: pr.number,
    branchName,
  };
}

export async function postPullRequestComment(input: {
  config: IncidentGitHubConfig;
  pullNumber: number;
  body: string;
}): Promise<GitHubCommentResult> {
  const ownerRepo = `${input.config.owner}/${input.config.repo}`;
  const comment = await githubRequest<{ html_url: string }>(
    input.config.token,
    `https://api.github.com/repos/${ownerRepo}/issues/${input.pullNumber}/comments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: input.body }),
    },
  );

  return { url: comment.html_url };
}

export async function mergePullRequest(input: {
  config: IncidentGitHubConfig;
  pullNumber: number;
  commitTitle: string;
}): Promise<{ merged: boolean; message: string }> {
  const ownerRepo = `${input.config.owner}/${input.config.repo}`;
  try {
    const merged = await githubRequest<{ merged: boolean; message: string }>(
      input.config.token,
      `https://api.github.com/repos/${ownerRepo}/pulls/${input.pullNumber}/merge`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commit_title: input.commitTitle, merge_method: "squash" }),
      },
    );

    return {
      merged: Boolean(merged.merged),
      message: merged.message || (merged.merged ? "Merged" : "Not merged"),
    };
  } catch (err) {
    return {
      merged: false,
      message: err instanceof Error ? err.message : "Merge failed",
    };
  }
}
