import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/src/backend/auth/request";
import { updateStore } from "@/src/backend/db/store";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await updateStore((store) => {
    store.latencyBugFixed = false;
    store.latencyIncidentOpen = false;
    store.latencyIncidentReportedAt = null;
    store.apiMetrics = {
      profileLoadAvgMs: 760,
      profileLoadP95Ms: 980,
      lastChecked: new Date().toISOString(),
    };
    store.loopRuns = [];
    store.errorLogs = [];
  });

  return NextResponse.json({ success: true });
}
