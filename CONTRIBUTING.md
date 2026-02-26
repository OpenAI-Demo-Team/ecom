# Contributing

Thanks for contributing to DevSpace.

## Prerequisites

- Node.js 18.18+ (or 20.x LTS recommended)
- npm 9+

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Development Workflow

1. Create a branch from `main`.
2. Make focused changes.
3. Run quality checks locally:

```bash
npm run check
```

4. Open a pull request with a clear summary and test evidence.

## Pull Request Guidelines

- Keep PRs small and scoped.
- Include before/after screenshots for UI changes.
- Add or update tests for behavior changes.
- Do not include secrets in code, issues, or PR descriptions.

## Commit Message Guidance

Use descriptive, imperative messages, for example:

- `fix(admin): keep diagnostics degraded until merge`
- `feat(profile): improve fallback animation layering`

## Reporting Bugs

Use the GitHub bug report template and include:

- Repro steps
- Expected vs actual behavior
- Logs/screenshots
- Environment details (OS, Node version)

## Security Issues

Do **not** open public issues for vulnerabilities. See [SECURITY.md](./SECURITY.md).
