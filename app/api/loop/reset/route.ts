import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "../../../../src/backend/auth/request";
import { resetRemediationDemo } from "../../../../src/backend/services/incidentLoop";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login?next=/admin", request.url));
  }

  await resetRemediationDemo();
  return NextResponse.redirect(new URL("/admin?loop=reset", request.url));
}
