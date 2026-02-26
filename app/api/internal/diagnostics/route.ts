import { NextResponse } from "next/server";
import { readStore, updateStore } from "@/src/backend/db/store";

const ARTIFICIAL_DELAY_MS = 850;

export async function GET() {
  const store = await readStore();
  const isLatencyBugActive = !store.latencyBugFixed;
  const startedAt = Date.now();

  if (isLatencyBugActive) {
    await new Promise((resolve) => setTimeout(resolve, ARTIFICIAL_DELAY_MS));
  }

  const elapsed = Date.now() - startedAt;
  await updateStore((s) => {
    const avg = isLatencyBugActive ? Math.max(elapsed, ARTIFICIAL_DELAY_MS) : 45;
    const p95 = isLatencyBugActive ? Math.max(Math.round(avg * 1.4), 520) : 95;
    s.apiMetrics.profileLoadAvgMs = avg;
    s.apiMetrics.profileLoadP95Ms = p95;
    s.apiMetrics.lastChecked = new Date().toISOString();
  });

  return NextResponse.json({
    ok: true,
    endpoint: "/api/internal/diagnostics",
    degraded: isLatencyBugActive,
    latencyMs: elapsed,
  });
}
