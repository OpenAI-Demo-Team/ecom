export type Role = "CUSTOMER" | "ADMIN";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
};

export type AgentCategory = "Support" | "Sales" | "Operations";

export type Product = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  category: AgentCategory;
  capabilities: string[];
  seatsIncluded: number;
  inventory: number;
};

export type Order = {
  id: string;
  userId: string;
  items: Array<{ productId: string; qty: number; unitPriceCents: number }>;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  status: "PENDING" | "PAID" | "FAILED";
  createdAt: Date;
};

export type Review = {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  body: string;
  createdAt: Date;
};

export type ErrorLog = {
  id: string;
  area: "CHECKOUT" | "PAYMENTS" | "CATALOG" | "AUTH";
  message: string;
  stack?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

export type AIIncident = {
  id: string;
  incidentType: "CHECKOUT_PROMO_BUG" | "RECOMMENDER_DRIFT" | "TOXIC_OUTPUT" | "FAILED_AUTOFIX";
  severity: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
  relatedErrorLogIds: string[];
  createdAt: Date;
};
