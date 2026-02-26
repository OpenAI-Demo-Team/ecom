import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "@/src/backend/auth/session";
import { readStore } from "@/src/backend/db/store";

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(token);
  if (!user) return NextResponse.json({ user: null });

  const store = await readStore();
  const profile = store.profiles.find(p => p.userId === user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      username: profile?.username ?? user.id.replace("u-", ""),
      avatarUrl: profile?.avatarUrl ?? null,
      displayName: profile?.displayName ?? user.name,
    }
  });
}
