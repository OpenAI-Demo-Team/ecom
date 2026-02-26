# StackStore Demo Script

> **Narrative**: "Self-Healing Commerce" — an e-commerce store where Codex is wired into the incident pipeline. When checkout breaks, Codex fixes it automatically.

Total runtime: **5 minutes** (2:30 app demo + 2:30 how-I-built-this)

---

## Pre-Demo Checklist

```bash
# 1. Reset demo state
npm run dev            # start the dev server
# 2. Open http://localhost:3000 in browser
# 3. Make sure you're logged out (clean state)
# 4. Reset the remediation loop:
#    POST http://localhost:3000/api/loop/reset
#    (or login as admin and click "Reset Demo" in Ops Console)
# 5. Verify: Ops Console shows 0 checkouts, 0% error rate, bug "Active"
```

---

## Section 1: The App (0:00 – 2:30)

### 0:00 – 0:25 | Hook + Homepage

**Show**: Homepage at `/`

**Say**:
> "I built a developer gear e-commerce store — keyboards, monitors, headphones — in a few hours with Codex. But the interesting part isn't the store itself. It's what happens when things break. This store can heal itself."

**Do**:
- Scroll slowly through the homepage hero
- Pause on the "How it works" pipeline to show the 5-step flow
- Point out: "This is a real e-commerce app — login, cart, checkout, promo codes. Codex is running behind the scenes."

---

### 0:25 – 0:55 | Login + Browse Products

**Show**: `/login` → `/products` → `/products/mecha-k1`

**Say**:
> "Let me show you the e-commerce flow. I'll login as a customer — this uses session-based auth with persistent cookies."

**Do**:
1. Navigate to `/login`
2. Enter `buyer@stackstore.demo` / `buyer123`
3. Login → redirected to products
4. Browse the 3 products (Mecha K1 Keyboard, ArcView Monitor, SilentPod Headphones)
5. Click into Mecha K1 detail page
6. Point out: features, pricing, recommendations carousel
7. Say: "Real product pages, persistent cart, the works."

---

### 0:55 – 1:25 | Cart + Trigger the Bug

**Show**: Add to cart → `/cart` → apply promo → `/checkout`

**Say**:
> "Now I'll add this keyboard to my cart and apply a promo code. Watch what happens to the total."

**Do**:
1. Click "Add to Cart" on Mecha K1
2. On `/cart`, enter `SAVE10` in the promo field, click "Apply Promo"
3. Point out the warning: "Bug active: discount applied twice"
4. Navigate to `/checkout`
5. Point to the comparison table: "Expected total is $170.10, but the system is charging $151.20. The discount is being subtracted twice."
6. Point to the red alert banner at the top

**Say**:
> "In a real production system, this would mean customers are being undercharged — silent revenue loss. Now here's where it gets interesting."

---

### 1:25 – 1:55 | Codex Remediation

**Show**: Logout → login as admin → `/checkout` → "Run Codex Remediation" → `/admin`

**Do**:
1. Logout
2. Login as `admin@stackstore.demo` / `admin123`
3. Navigate to `/checkout`, click "Run Codex Remediation"
4. Navigate to `/admin` (Ops Console)
5. Walk through the timeline stepper:
   - **Detected**: error rate crossed 2%
   - **Codex Analysis**: root cause identified
   - **PR Opened**: patch + test generated
   - **Auto Review**: no breaking changes
   - **Merged**: fix deployed

**Say**:
> "One click — and Codex just diagnosed a production incident, wrote the fix, generated a regression test, opened a PR, auto-reviewed it, and merged it. No pager. No engineer woken up at 3am."

---

### 1:55 – 2:30 | Verify the Fix

**Show**: `/admin` metrics → `/checkout` (as buyer)

**Do**:
1. On admin page, point to: Bug Status = "Fixed", error rate dropped
2. Show the generated patch diff and merge summary
3. Logout, login as buyer again
4. Navigate to `/checkout`
5. Show: alert banner is now green, "Healthy: Promo Calculation Correct"
6. Show: Expected and Actual totals now match

**Say**:
> "The system healed itself. The promo calculation is correct, totals match, and we have a generated test to prevent regression. All powered by Codex running inside the app."

---

## Section 2: How I Built This (2:30 – 5:00)

### 2:30 – 3:00 | Architecture Overview

**Show**: File tree in IDE / quick code scroll

**Say**:
> "Let me show you what's under the hood. This is a Next.js 14 app with the App Router. Session-based auth, JSON file persistence, and a full API layer. All built with Codex."

**Do**:
- Show `app/layout.tsx` — "Root layout with auth-aware navigation"
- Show `src/backend/db/store.ts` — "JSON store persists users, carts, sessions, metrics, and loop history"
- Show `src/backend/auth/session.ts` — "24-hour session cookies"

**Key point**: "This has everything the hackathon spec requires — login, persistence, and tests."

---

### 3:00 – 3:40 | Programmatic Codex Integration

**Show**: `src/backend/services/codexSdkClient.ts`

**Say**:
> "Here's the key part — Codex isn't just a coding assistant. It's running *inside* the app as production infrastructure."

**Do**:
1. Show the `analyzeCheckoutIncidentWithCodex` function
2. Highlight the API call: `POST https://api.openai.com/v1/responses` with model `gpt-5-codex`
3. Walk through the prompt: incident logs + code context
4. Show the structured JSON response: patch diff, test file, JIRA payload, PR title, review summary
5. Show the fallback: deterministic mock when no API key is set

**Say**:
> "One API call to the Codex Responses endpoint, and we get everything we need to close an incident — the patch, the test, the PR, and the review. This is what programmatic Codex looks like."

---

### 3:40 – 4:10 | The Incident Loop

**Show**: `src/backend/services/incidentLoop.ts` + `src/backend/workers/checkoutMonitorWorker.ts`

**Say**:
> "The orchestration layer ties it all together."

**Do**:
1. Show `incidentLoop.ts` — `runCodexPromoRemediationLoop`:
   - Simulates checkout traffic
   - Calls the monitor worker
   - If error rate > 2%, calls Codex
   - Persists the timeline, flips the bug state
2. Show the timeline generation: Detected → Analysis → PR → Review → Merge
3. Briefly show `checkoutMonitorWorker.ts` — the threshold check

**Say**:
> "The monitor detects the error rate, calls Codex programmatically, and the loop persists everything to the JSON store. The admin console reads that state and renders the timeline."

---

### 4:10 – 4:40 | Tests

**Show**: Terminal running `npm test`

**Do**:
1. Run `npm test` in terminal
2. Show 4 test suites passing:
   - `checkout.calculation.test.ts` — verifies the promo bug and the fix
   - `auth.persistence.test.ts` — session creation, validation, cart persistence
   - `checkout.monitor.worker.test.ts` — threshold detection logic
   - `incident.loop.test.ts` — full remediation loop end-to-end

**Say**:
> "Four meaningful test suites — not smoke tests. They cover the checkout math, auth flow, error monitoring, and the full remediation loop."

---

### 4:40 – 5:00 | Closing

**Show**: Homepage or Ops Console

**Say**:
> "To recap: I built a production-grade e-commerce store with auth, data persistence, and a self-healing incident pipeline. Codex built the app, and Codex runs inside it — that's the two sides of this demo. The app itself, and Codex as programmatic infrastructure."

> "If you want to dig into the code, everything is in the repo. Thanks for watching."

---

## Quick Reference

| Element              | Where                                             |
|----------------------|---------------------------------------------------|
| Login / auth         | `src/backend/auth/`, `app/api/auth/`              |
| Data persistence     | `src/backend/db/store.ts`, `output/*.json`        |
| Tests                | `tests/` (4 suites, Vitest)                       |
| Programmatic Codex   | `src/backend/services/codexSdkClient.ts`          |
| Incident loop        | `src/backend/services/incidentLoop.ts`            |
| Monitor worker       | `src/backend/workers/checkoutMonitorWorker.ts`    |
| Demo accounts        | `admin@stackstore.demo` / `admin123`              |
|                      | `buyer@stackstore.demo` / `buyer123`              |
| Promo code           | `SAVE10`                                          |
