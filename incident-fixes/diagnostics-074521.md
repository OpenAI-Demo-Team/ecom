## Summary
- Remove intentional latency delay from `/api/internal/diagnostics`.
- Keep all user-facing APIs untouched.
- Jira: https://ecomdemoteam.atlassian.net/browse/SCRUM-9

## Patch
```diff
--- a/app/api/internal/diagnostics/route.ts
+++ b/app/api/internal/diagnostics/route.ts
@@ -10,8 +10,4 @@ export async function GET() {
-  if (isLatencyBugActive) {
-    await new Promise((resolve) => setTimeout(resolve, ARTIFICIAL_DELAY_MS));
-  }
-
   const elapsed = Date.now() - startedAt;
   const avg = 45;
   const p95 = 95;
```
