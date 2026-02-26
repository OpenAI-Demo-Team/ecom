import { addHours } from "../utils/time";
import { createSessionToken, readStore, updateStore } from "../db/store";
import type { Role, User } from "../types/domain";

export const SESSION_COOKIE_NAME = "agentmarket_session";

function toUser(input: { id: string; email: string; name: string; role: Role; createdAt: string }): User {
  return {
    id: input.id,
    email: input.email,
    name: input.name,
    role: input.role,
    createdAt: new Date(input.createdAt)
  };
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const store = await readStore();
  const normalized = email.trim().toLowerCase();
  const found = store.users.find((user) => user.email.toLowerCase() === normalized && user.password === password);
  return found ? toUser(found) : null;
}

export async function createSessionForUser(userId: string): Promise<string> {
  const token = createSessionToken();
  const now = new Date();
  const expires = addHours(now, 24);

  await updateStore((store) => {
    store.sessions = store.sessions.filter((session) => new Date(session.expiresAt).getTime() > now.getTime());
    store.sessions.push({
      token,
      userId,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString()
    });
  });

  return token;
}

export async function clearSession(token: string): Promise<void> {
  await updateStore((store) => {
    store.sessions = store.sessions.filter((session) => session.token !== token);
  });
}

export async function getUserFromSessionToken(token: string | undefined | null): Promise<User | null> {
  if (!token) return null;

  const store = await readStore();
  const session = store.sessions.find((item) => item.token === token);
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await clearSession(token);
    return null;
  }

  const user = store.users.find((candidate) => candidate.id === session.userId);
  return user ? toUser(user) : null;
}
