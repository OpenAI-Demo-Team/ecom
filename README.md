# DevSpace: Building With Codex

DevSpace is a social platform demo built for a Codex hackathon scenario. The app is designed to show:
- how quickly Codex can power high-impact product features for developers
- how Codex can be used programmatically inside internal workflows

## Project Overview

The product theme is developer identity on a major eCommerce-style platform:
- users sign up, log in, and maintain a profile
- profiles are visually transformed by Codex from plain-text vibe prompts
- users can post to a social feed, like, comment, and explore others
- all primary application data is persisted to disk

## Codex Used In Two Ways

### 1) External, user-facing developer experience

Codex is used to generate profile HTML/CSS from a prompt so each user gets a unique visual identity page:
- main generator service: `src/backend/services/profileGenerator.ts`
- API endpoint: `app/api/profile/generate/route.ts`
- optional Codex-authored PR draft flow for user profile updates: `app/api/profile/pr/route.ts`

### 2) Internal, operational self-healing workflow

Codex is used inside an internal admin workflow for incident remediation:
- detect degraded API state in admin dashboard
- create incident context, generate patch + regression test, and draft remediation PR
- publish review/report links in the loop timeline

Key paths:
- admin UI: `app/admin/page.tsx`
- run loop API: `app/api/loop/run/route.ts`
- orchestration + integrations: `src/backend/services/githubIncidentService.ts`, `src/backend/services/jiraService.ts`

## Core Capabilities

- Login and authorization via session cookies and role-aware routes
- Persistent data storage (`output/devspace-store.json`, configurable)
- Meaningful automated tests (`tests/` with Vitest)
- Programmatic Codex usage through OpenAI SDK integrations

## Tech Stack

- Next.js 14 (App Router), React 18, TypeScript
- Next.js API routes for backend handlers
- OpenAI Node SDK for Codex/Responses usage
- JSON-file persistence for deterministic local demos
- Vitest for test coverage

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Recommended Node version: `20.x` (`.nvmrc` included).

## Environment Variables

```bash
OPENAI_API_KEY=your-openai-api-key
CODEX_MODEL=gpt-5.3-codex
CODEX_REASONING_EFFORT=medium
CODEX_TIMEOUT_MS=45000
CODEX_MAX_OUTPUT_TOKENS=3200

# optional GitHub/Jira integration for PR and incident flows
DEVSPACE_DEFAULT_GITHUB_TOKEN=your-github-token
GITHUB_REPO_OWNER=your-org-or-user
GITHUB_REPO_NAME=your-repo
GITHUB_BASE_BRANCH=main
GITHUB_BRANCH_PREFIX=feature
INCIDENT_GITHUB_TOKEN=your-github-token
INCIDENT_GITHUB_REPO=your-org-or-user/your-repo
INCIDENT_GITHUB_BASE_BRANCH=main
INCIDENT_GITHUB_BRANCH_PREFIX=feature
INCIDENT_AUTO_MERGE=false
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=you@company.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_PROJECT_KEY=PROJ
JIRA_BOARD_ID=1
```

## Quality Checks

```bash
npm run check
```

## Demo Accounts

| User | Email | Password |
|------|-------|----------|
| Jack Chen | jack@devspace.demo | demo123 |
| Mira Patel | mira@devspace.demo | demo123 |
| Zeph Torres | zeph@devspace.demo | demo123 |
| Luna Kim | luna@devspace.demo | demo123 |
| Rex Morrison | rex@devspace.demo | demo123 |
| Nova Osei | nova@devspace.demo | demo123 |
| Admin | admin@devspace.demo | admin123 |

## Suggested 5-Min Video Structure

1. Product demo: sign up/login, social feed interaction, profile vibe transformation.
2. Build breakdown: planning approach, where Codex is used, and how tests/persistence were handled.

## Open Source Notes

- License: [MIT](./LICENSE)
- Contributing: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Code of Conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- Security: [SECURITY.md](./SECURITY.md)
