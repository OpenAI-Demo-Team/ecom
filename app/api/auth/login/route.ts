import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createSessionForUser, SESSION_COOKIE_NAME } from "../../../../src/backend/auth/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  const redirectPath = next.startsWith("/") ? next : "/";

  const user = await authenticateUser(email, password);
  if (!user) {
    return NextResponse.redirect(new URL(`/login?error=invalid&next=${encodeURIComponent(redirectPath)}`, request.url));
  }

  const token = await createSessionForUser(user.id);
  const response = NextResponse.redirect(new URL(redirectPath, request.url));
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24
  });

  return response;
}
