type ThemeSnapshot = {
  prompt: string;
  html: string;
  css: string;
};

export type CreateGitHubProfilePrInput = {
  token: string;
  owner: string;
  repo: string;
  baseBranch: string;
  branchName: string;
  title: string;
  body: string;
  username: string;
  displayName: string;
  head: ThemeSnapshot;
};

export type CreateGitHubProfilePrResult = {
  url: string;
  number: number;
  branchName: string;
  filePath: string;
};

async function githubRequest<T>(
  token: string,
  url: string,
  init?: RequestInit,
): Promise<T> {
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
    throw new Error(`GitHub API ${response.status}: ${text.slice(0, 300)}`);
  }

  return (await response.json()) as T;
}

function safeBranchName(name: string): string {
  return name.replace(/[^a-zA-Z0-9/_-]/g, "-").slice(0, 120);
}

function toBase64(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64");
}

export async function createGitHubProfilePullRequest(
  input: CreateGitHubProfilePrInput,
): Promise<CreateGitHubProfilePrResult> {
  const ownerRepo = `${input.owner}/${input.repo}`;
  const baseRefUrl = `https://api.github.com/repos/${ownerRepo}/git/ref/heads/${encodeURIComponent(input.baseBranch)}`;
  const baseRef = await githubRequest<{ object: { sha: string } }>(input.token, baseRefUrl);
  const baseSha = baseRef.object.sha;

  let branchName = safeBranchName(input.branchName);
  const refUrl = `https://api.github.com/repos/${ownerRepo}/git/refs`;
  try {
    await githubRequest<{ ref: string; object: { sha: string } }>(input.token, refUrl, {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      }),
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    branchName = safeBranchName(`${branchName}-${Date.now().toString().slice(-5)}`);
    await githubRequest<{ ref: string; object: { sha: string } }>(input.token, refUrl, {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      }),
      headers: { "Content-Type": "application/json" },
    });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = `profile-prs/${input.username}/${stamp}.json`;
  const fileContent = JSON.stringify(
    {
      username: input.username,
      displayName: input.displayName,
      vibePrompt: input.head.prompt,
      generatedHtml: input.head.html,
      generatedCss: input.head.css,
      createdAt: new Date().toISOString(),
    },
    null,
    2,
  );

  await githubRequest(input.token, `https://api.github.com/repos/${ownerRepo}/contents/${encodeURIComponent(filePath)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `feat(profile): update ${input.username} vibe snapshot`,
      content: toBase64(fileContent),
      branch: branchName,
    }),
  });

  const pr = await githubRequest<{ html_url: string; number: number }>(
    input.token,
    `https://api.github.com/repos/${ownerRepo}/pulls`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: input.title,
        head: branchName,
        base: input.baseBranch,
        body: input.body,
      }),
    },
  );

  return {
    url: pr.html_url,
    number: pr.number,
    branchName,
    filePath,
  };
}
