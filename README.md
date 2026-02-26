# StackStore

A developer gear e-commerce store with a Codex-powered self-healing checkout pipeline.

## What this demo includes
- Login and authorization
  - Demo users: `admin@stackstore.demo` / `admin123`, `buyer@stackstore.demo` / `buyer123`
  - Session cookie auth
  - Admin-only ops console and loop controls
- Data persistence
  - JSON store persisted at `output/stackstore.json`
  - Persists users, sessions, cart, promo state, metrics, error logs, and remediation history
- Programmatic Codex use inside the app
  - `src/backend/services/codexSdkClient.ts` calls the OpenAI Responses API (Codex model) when `OPENAI_API_KEY` is set
  - Falls back to deterministic mock output when no key is available
- Checkout incident loop
- Promo code: `SAVE10`
  - Bug: discount applied twice in `calculateCartTotal`
  - Monitor detects >2% failure rate and runs Codex analysis
  - Demo timeline shows patch, PR, auto-review, merge, and fixed state

## Core files
- Auth/session
  - `src/backend/auth/session.ts`
  - `src/backend/auth/server.ts`
  - `app/api/auth/login/route.ts`
  - `app/api/auth/logout/route.ts`
- Persistence
  - `src/backend/db/store.ts`
- Store/cart/checkout
  - `src/backend/services/catalog.ts`
  - `src/backend/services/cartStore.ts`
  - `src/backend/services/checkout.ts`
- Codex integration + loop
  - `src/backend/services/codexSdkClient.ts`
  - `src/backend/workers/checkoutMonitorWorker.ts`
  - `src/backend/services/incidentLoop.ts`
- UI
  - `app/page.tsx`, `app/products/*`, `app/cart/page.tsx`, `app/checkout/page.tsx`, `app/admin/page.tsx`, `app/login/page.tsx`

## Run
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

## Tests
```bash
npm test
```
Current meaningful coverage:
- `tests/checkout.calculation.test.ts`
- `tests/auth.persistence.test.ts`
- `tests/checkout.monitor.worker.test.ts`
- `tests/incident.loop.test.ts`
