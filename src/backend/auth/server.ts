import { cookies } from "next/headers";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "./session";
import type { Role, User } from "../types/domain";

export async function getCurrentUser(): Promise<User | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  return getUserFromSessionToken(token ?? null);
}

export async function isAuthorized(role: Role): Promise<{ allowed: boolean; user: User | null }> {
  const user = await getCurrentUser();
  if (!user) return { allowed: false, user: null };
  return { allowed: user.role === role, user };
}
