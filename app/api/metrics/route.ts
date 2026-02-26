import { NextResponse } from "next/server";
import { readStore } from "@/src/backend/db/store";

export async function GET() {
  const store = await readStore();
  return NextResponse.json({
    ...store.apiMetrics,
    latencyBugFixed: store.latencyBugFixed,
    latencyIncidentOpen: store.latencyIncidentOpen && !store.latencyBugFixed,
    latencyIncidentReportedAt: store.latencyIncidentReportedAt,
  });
}
