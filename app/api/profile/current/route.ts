import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "../../../../src/backend/auth/session";
import { readStore } from "../../../../src/backend/db/store";

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(token ?? null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = await readStore();
  const profile = store.profiles.find((p) => p.userId === user.id);
  if (!profile) {
    return NextResponse.json({ error: "No profile found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}
