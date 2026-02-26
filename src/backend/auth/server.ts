export type CurrentUser = {
  name: string;
  role: "ADMIN" | "USER";
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  return null;
}
