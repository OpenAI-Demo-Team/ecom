import type { NextRequest } from "next/server";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "./session";

export async function getUserFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return getUserFromSessionToken(token ?? null);
}
