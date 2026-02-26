import type { Product } from "../types/domain";

export const products: Product[] = [
  {
    id: "agent-support-pro",
    name: "SupportFlow Agent",
    description:
      "24/7 customer support agent for chat + voice with policy-grounded responses, multilingual handling, and handoff controls.",
    priceCents: 9900,
    imageUrl: "/agents/supportflow.svg",
    category: "Support",
    capabilities: ["voice", "chat", "ticket triage", "policy retrieval"],
    seatsIncluded: 25,
    inventory: 120
  },
  {
    id: "agent-sales-pilot",
    name: "DealPilot Agent",
    description:
      "Revenue-focused AI agent that qualifies leads, answers product questions, and recommends next-best actions to increase conversion.",
    priceCents: 12900,
    imageUrl: "/agents/dealpilot.svg",
    category: "Sales",
    capabilities: ["lead qualification", "objection handling", "upsell suggestions", "crm notes"],
    seatsIncluded: 20,
    inventory: 84
  },
  {
    id: "agent-ops-analyst",
    name: "OpsSignal Agent",
    description:
      "Operations intelligence agent that monitors incidents, highlights root causes, and drafts remediation steps for engineering teams.",
    priceCents: 14900,
    imageUrl: "/agents/opssignal.svg",
    category: "Operations",
    capabilities: ["incident triage", "root cause hints", "workflow automation", "sla monitoring"],
    seatsIncluded: 15,
    inventory: 56
  }
];

export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}

export function getRecommendations(productId: string): Product[] {
  const selected = getProductById(productId);
  if (!selected) return products.slice(0, 2);

  return products
    .filter((product) => product.id !== productId)
    .sort((a, b) => {
      const overlapA = a.capabilities.filter((c) => selected.capabilities.includes(c)).length;
      const overlapB = b.capabilities.filter((c) => selected.capabilities.includes(c)).length;
      return overlapB - overlapA;
    })
    .slice(0, 2);
}
