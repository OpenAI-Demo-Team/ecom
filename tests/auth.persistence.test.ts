import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authenticateUser, createSessionForUser, getUserFromSessionToken, createUser, isUsernameTaken } from "@/src/backend/auth/session";
import { readStore, resetStore } from "@/src/backend/db/store";

let tempDir = "";

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "devspace-test-"));
  process.env.STORE_PATH = path.join(tempDir, "store.json");
  await resetStore();
});

afterEach(async () => {
  delete process.env.STORE_PATH;
  await rm(tempDir, { recursive: true, force: true });
});

describe("auth and persistence", () => {
  it("authenticates demo admin and resolves session user", async () => {
    const user = await authenticateUser("admin@devspace.demo", "admin123");
    expect(user?.role).toBe("ADMIN");

    const token = await createSessionForUser(user!.id);
    const fromSession = await getUserFromSessionToken(token);

    expect(fromSession?.email).toBe("admin@devspace.demo");
    expect(fromSession?.name).toContain("Admin");
  });

  it("creates a new user and checks username availability", async () => {
    expect(await isUsernameTaken("newuser")).toBe(false);

    const user = await createUser({
      email: "new@test.com",
      password: "pass123",
      name: "New User",
      username: "newuser",
    });

    expect(user.id).toBe("u-newuser");
    expect(user.email).toBe("new@test.com");
    expect(await isUsernameTaken("newuser")).toBe(true);
  });

  it("store has posts, comments, and profiles seeded", async () => {
    const store = await readStore();

    expect(store.posts.length).toBeGreaterThan(0);
    expect(store.comments.length).toBeGreaterThan(0);
    expect(store.profiles.length).toBeGreaterThanOrEqual(6);

    const usernames = store.profiles.map((p) => p.username);
    expect(usernames).toContain("jack");
    expect(usernames).toContain("mira");
    expect(usernames).toContain("nova");
  });

  it("session resolves to the correct user", async () => {
    const user = await authenticateUser("jack@devspace.demo", "demo123");
    expect(user).not.toBeNull();

    const token = await createSessionForUser(user!.id);
    const fromSession = await getUserFromSessionToken(token);
    expect(fromSession?.email).toBe("jack@devspace.demo");
  });
});
