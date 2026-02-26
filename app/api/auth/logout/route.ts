import { NextRequest, NextResponse } from "next/server";
import { clearSession, SESSION_COOKIE_NAME } from "../../../../src/backend/auth/session";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) await clearSession(token);

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0
  });

  return response;
}
