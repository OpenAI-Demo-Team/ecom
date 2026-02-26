import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "@/src/backend/auth/session";
import { updateStore } from "@/src/backend/db/store";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const postId = params.id;

  const result = await updateStore((store) => {
    const post = store.posts.find(p => p.id === postId);
    if (!post) return null;
    const idx = post.likes.indexOf(user.id);
    if (idx >= 0) {
      post.likes.splice(idx, 1);
    } else {
      post.likes.push(user.id);
    }
    return { likes: post.likes, liked: idx < 0 };
  });

  if (!result) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  return NextResponse.json(result);
}
