import { randomUUID } from "node:crypto";
import { readStore, updateStore, type Post, type Comment } from "../db/store";

export type PostWithComments = Post & { comments: Comment[] };

export async function getFeed(): Promise<PostWithComments[]> {
  const store = await readStore();
  const sorted = [...store.posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return sorted.map((post) => ({
    ...post,
    comments: store.comments
      .filter((c) => c.postId === post.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  }));
}

export async function createPost(
  userId: string,
  content: string,
  imageUrl?: string | null
): Promise<Post> {
  const store = await readStore();
  const profile = store.profiles.find((p) => p.userId === userId);
  const user = store.users.find((u) => u.id === userId);

  const post: Post = {
    id: randomUUID(),
    userId,
    username: profile?.username ?? user?.email ?? "unknown",
    displayName: profile?.displayName ?? user?.name ?? "Unknown",
    avatarUrl: profile?.avatarUrl ?? "",
    content,
    imageUrl: imageUrl ?? null,
    likes: [],
    createdAt: new Date().toISOString(),
  };

  await updateStore((s) => {
    s.posts.push(post);
  });

  return post;
}

export async function toggleLike(postId: string, userId: string): Promise<string[]> {
  return updateStore((s) => {
    const post = s.posts.find((p) => p.id === postId);
    if (!post) return [];
    const idx = post.likes.indexOf(userId);
    if (idx === -1) {
      post.likes.push(userId);
    } else {
      post.likes.splice(idx, 1);
    }
    return [...post.likes];
  });
}

export async function addComment(
  postId: string,
  userId: string,
  content: string
): Promise<Comment | null> {
  const store = await readStore();
  const profile = store.profiles.find((p) => p.userId === userId);
  const user = store.users.find((u) => u.id === userId);

  const comment: Comment = {
    id: randomUUID(),
    postId,
    userId,
    username: profile?.username ?? user?.email ?? "unknown",
    displayName: profile?.displayName ?? user?.name ?? "Unknown",
    content,
    createdAt: new Date().toISOString(),
  };

  await updateStore((s) => {
    s.comments.push(comment);
  });

  return comment;
}

export async function getUserPosts(userId: string): Promise<PostWithComments[]> {
  const store = await readStore();
  const userPosts = store.posts
    .filter((p) => p.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return userPosts.map((post) => ({
    ...post,
    comments: store.comments
      .filter((c) => c.postId === post.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  }));
}
