import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "@/src/backend/auth/session";
import { getFriends, addFriend } from "@/src/backend/services/friendService";

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const friends = await getFriends(user.id);
  return NextResponse.json(friends);
}

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { friendId?: string };
  if (!body.friendId) {
    return NextResponse.json({ error: "friendId is required" }, { status: 400 });
  }

  await addFriend(user.id, body.friendId);
  return NextResponse.json({ success: true });
}
