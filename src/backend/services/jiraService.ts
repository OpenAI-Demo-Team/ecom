type JiraBugResult = {
  status: "created" | "skipped" | "failed";
  message: string;
  issueKey?: string;
  issueUrl?: string;
  boardUrl?: string;
};

type JiraTransitionResult = {
  status: "moved" | "skipped" | "failed";
  message: string;
  fromStatus?: string;
  toStatus?: string;
};

type JiraConfig = {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
};

function getBoardUrl(baseUrl: string, projectKey: string): string | undefined {
  const fromEnv = (process.env.JIRA_BOARD_URL ?? "").trim();
  if (fromEnv) return fromEnv;

  const boardId = (process.env.JIRA_BOARD_ID ?? "").trim();
  if (boardId) return `${baseUrl}/jira/software/projects/${projectKey}/boards/${boardId}`;

  return `${baseUrl}/jira/software/projects/${projectKey}/boards`;
}

function getJiraConfig(): JiraConfig | null {
  const baseUrl = (process.env.JIRA_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const email = (process.env.JIRA_EMAIL ?? "").trim();
  const apiToken = (process.env.JIRA_API_TOKEN ?? "").trim();
  const projectKey = (process.env.JIRA_PROJECT_KEY ?? "").trim();

  if (!baseUrl || !email || !apiToken || !projectKey) return null;
  return { baseUrl, email, apiToken, projectKey };
}

function getJiraAuthHeader(email: string, apiToken: string): string {
  return `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;
}

export function getConfiguredJiraBoardUrl(): string | undefined {
  const baseUrl = (process.env.JIRA_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const projectKey = (process.env.JIRA_PROJECT_KEY ?? "").trim();
  if (!baseUrl || !projectKey) return undefined;
  return getBoardUrl(baseUrl, projectKey);
}

export async function createLatencyIncidentBug(input: {
  summary: string;
  details: string;
  reporterName?: string;
}): Promise<JiraBugResult> {
  const config = getJiraConfig();

  if (!config) {
    const baseUrl = (process.env.JIRA_BASE_URL ?? "").trim().replace(/\/+$/, "");
    const projectKey = (process.env.JIRA_PROJECT_KEY ?? "").trim();
    return {
      status: "skipped",
      message: "Jira env is missing. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, and JIRA_PROJECT_KEY.",
      boardUrl: baseUrl && projectKey ? getBoardUrl(baseUrl, projectKey) : undefined,
    };
  }

  try {
    const response = await fetch(`${config.baseUrl}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getJiraAuthHeader(config.email, config.apiToken),
      },
      body: JSON.stringify({
        fields: {
          project: { key: config.projectKey },
          summary: input.summary,
          issuetype: { name: "Bug" },
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: input.details }],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: `Reported via DevSpace Ops Console${input.reporterName ? ` by ${input.reporterName}` : ""}.`,
                  },
                ],
              },
            ],
          },
          labels: ["devspace", "latency", "codex-demo"],
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        status: "failed",
        message: `Jira create failed (${response.status}): ${text.slice(0, 220)}`,
        boardUrl: getBoardUrl(config.baseUrl, config.projectKey),
      };
    }

    const payload = (await response.json()) as { key?: string };
    const issueKey = typeof payload.key === "string" ? payload.key : undefined;

    return {
      status: issueKey ? "created" : "failed",
      message: issueKey ? `Created Jira bug ${issueKey}.` : "Jira response did not include issue key.",
      issueKey,
      issueUrl: issueKey ? `${config.baseUrl}/browse/${issueKey}` : undefined,
      boardUrl: getBoardUrl(config.baseUrl, config.projectKey),
    };
  } catch (err) {
    return {
      status: "failed",
      message: err instanceof Error ? `Jira create failed: ${err.message}` : "Jira create failed.",
      boardUrl: getBoardUrl(config.baseUrl, config.projectKey),
    };
  }
}

export async function transitionJiraIssueToTodo(issueKey: string): Promise<JiraTransitionResult> {
  const key = issueKey.trim();
  if (!key) {
    return {
      status: "skipped",
      message: "Jira issue key missing; cannot move workflow state.",
    };
  }

  const config = getJiraConfig();
  if (!config) {
    return {
      status: "skipped",
      message: "Jira env is missing; cannot move issue to To Do.",
    };
  }

  try {
    const transitionsResponse = await fetch(`${config.baseUrl}/rest/api/3/issue/${encodeURIComponent(key)}/transitions`, {
      headers: {
        Accept: "application/json",
        Authorization: getJiraAuthHeader(config.email, config.apiToken),
      },
    });

    if (!transitionsResponse.ok) {
      const text = await transitionsResponse.text();
      return {
        status: "failed",
        message: `Jira transitions lookup failed (${transitionsResponse.status}): ${text.slice(0, 220)}`,
      };
    }

    const payload = (await transitionsResponse.json()) as {
      transitions?: Array<{ id?: string; name?: string; to?: { name?: string } }>;
    };
    const transitions = Array.isArray(payload.transitions) ? payload.transitions : [];
    const toDoTransition = transitions.find((t) => {
      const name = (t.name ?? "").toLowerCase();
      const toName = (t.to?.name ?? "").toLowerCase();
      return name === "to do" || toName === "to do";
    });

    if (!toDoTransition?.id) {
      return {
        status: "skipped",
        message: "No available Jira transition to To Do from current state.",
      };
    }

    const moveResponse = await fetch(`${config.baseUrl}/rest/api/3/issue/${encodeURIComponent(key)}/transitions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getJiraAuthHeader(config.email, config.apiToken),
      },
      body: JSON.stringify({
        transition: { id: toDoTransition.id },
      }),
    });

    if (!moveResponse.ok) {
      const text = await moveResponse.text();
      return {
        status: "failed",
        message: `Jira transition failed (${moveResponse.status}): ${text.slice(0, 220)}`,
      };
    }

    return {
      status: "moved",
      message: "Moved Jira issue to To Do.",
      toStatus: "To Do",
    };
  } catch (err) {
    return {
      status: "failed",
      message: err instanceof Error ? `Jira transition failed: ${err.message}` : "Jira transition failed.",
    };
  }
}
