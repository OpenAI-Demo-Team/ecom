export type Role = "CUSTOMER" | "ADMIN";

export type User = {
  id: string;
  email: string;
  name: string;
  githubToken?: string;
  role: Role;
  createdAt: Date;
};
