import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetStore } from "@/src/backend/db/store";
import { getFeed, createPost, toggleLike, addComment, getUserPosts } from "@/src/backend/services/postService";

let tempDir = "";

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "devspace-social-"));
  process.env.STORE_PATH = path.join(tempDir, "store.json");
  await resetStore();
});

afterEach(async () => {
  delete process.env.STORE_PATH;
  await rm(tempDir, { recursive: true, force: true });
});

describe("social feed", () => {
  it("getFeed returns posts sorted by date (newest first)", async () => {
    const feed = await getFeed();
    expect(feed.length).toBeGreaterThan(0);

    for (let i = 1; i < feed.length; i++) {
      const prev = new Date(feed[i - 1].createdAt).getTime();
      const curr = new Date(feed[i].createdAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it("createPost adds a post to the feed", async () => {
    const feedBefore = await getFeed();
    const beforeCount = feedBefore.length;

    const post = await createPost("u-jack", "Hello DevSpace!");
    expect(post.content).toBe("Hello DevSpace!");
    expect(post.userId).toBe("u-jack");
    expect(post.username).toBe("jack");

    const feedAfter = await getFeed();
    expect(feedAfter.length).toBe(beforeCount + 1);
    expect(feedAfter[0].content).toBe("Hello DevSpace!");
  });

  it("toggleLike adds and removes likes", async () => {
    const feed = await getFeed();
    const postId = feed[0].id;
    const userId = "u-rex";

    const initialHasLike = feed[0].likes.includes(userId);

    const likesAfterToggle = await toggleLike(postId, userId);

    if (initialHasLike) {
      expect(likesAfterToggle).not.toContain(userId);
    } else {
      expect(likesAfterToggle).toContain(userId);
    }

    const likesAfterSecondToggle = await toggleLike(postId, userId);

    if (initialHasLike) {
      expect(likesAfterSecondToggle).toContain(userId);
    } else {
      expect(likesAfterSecondToggle).not.toContain(userId);
    }
  });

  it("addComment creates a comment on a post", async () => {
    const feed = await getFeed();
    const postId = feed[0].id;
    const commentCountBefore = feed[0].comments.length;

    const comment = await addComment(postId, "u-luna", "Great post!");
    expect(comment).not.toBeNull();
    expect(comment!.content).toBe("Great post!");
    expect(comment!.postId).toBe(postId);
    expect(comment!.userId).toBe("u-luna");

    const feedAfter = await getFeed();
    const updatedPost = feedAfter.find((p) => p.id === postId)!;
    expect(updatedPost.comments.length).toBe(commentCountBefore + 1);
  });

  it("getUserPosts returns filtered posts for a specific user", async () => {
    const jackPosts = await getUserPosts("u-jack");
    expect(jackPosts.length).toBeGreaterThan(0);

    for (const post of jackPosts) {
      expect(post.userId).toBe("u-jack");
    }

    for (let i = 1; i < jackPosts.length; i++) {
      const prev = new Date(jackPosts[i - 1].createdAt).getTime();
      const curr = new Date(jackPosts[i].createdAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });
});
