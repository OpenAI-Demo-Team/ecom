import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Role } from "../types/domain";

export type PersistedUser = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  createdAt: string;
};

export type PersistedSession = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

export type PersistedCartLine = {
  sku: string;
  qty: number;
  unitPriceCents: number;
};

export type PersistedCart = {
  lines: PersistedCartLine[];
  promoCode: string | null;
};

export type PersistedErrorLog = {
  id: string;
  area: "CHECKOUT" | "PAYMENTS" | "CATALOG" | "AUTH";
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type PersistedTimelineStep = {
  label: string;
  status: "done" | "pending";
  detail: string;
  at: string;
};

export type PersistedLoopRun = {
  id: string;
  status: "healthy" | "fixed";
  errorRate: number;
  codexProvider: "openai-codex" | "fallback";
  patchDiff: string;
  regressionTest: string;
  prTitle: string;
  reviewSummary: string;
  mergeSummary: string;
  timeline: PersistedTimelineStep[];
  createdAt: string;
};

export type AgentMarketStore = {
  users: PersistedUser[];
  sessions: PersistedSession[];
  carts: Record<string, PersistedCart>;
  checkoutMetrics: {
    totalCheckouts: number;
    failedCheckouts: number;
  };
  errorLogs: PersistedErrorLog[];
  promoBugFixed: boolean;
  loopRuns: PersistedLoopRun[];
};

function nowISO(): string {
  return new Date().toISOString();
}

function defaultStore(): AgentMarketStore {
  const now = nowISO();
  return {
    users: [
      {
        id: "u-admin",
        email: "admin@agentmarket.demo",
        password: "admin123",
        name: "AgentMarket Admin",
        role: "ADMIN",
        createdAt: now
      },
      {
        id: "u-customer",
        email: "buyer@agentmarket.demo",
        password: "buyer123",
        name: "Demo Buyer",
        role: "CUSTOMER",
        createdAt: now
      }
    ],
    sessions: [],
    carts: {},
    checkoutMetrics: {
      totalCheckouts: 0,
      failedCheckouts: 0
    },
    errorLogs: [],
    promoBugFixed: false,
    loopRuns: []
  };
}

export function getStorePath(): string {
  return process.env.AGENTMARKET_STORE_PATH ?? path.join(process.cwd(), "output", "agentmarket-store.json");
}

export async function ensureStoreExists(): Promise<void> {
  const storePath = getStorePath();
  await mkdir(path.dirname(storePath), { recursive: true });

  try {
    await readFile(storePath, "utf-8");
  } catch {
    await writeFile(storePath, JSON.stringify(defaultStore(), null, 2), "utf-8");
  }
}

export async function readStore(): Promise<AgentMarketStore> {
  await ensureStoreExists();
  const raw = await readFile(getStorePath(), "utf-8");
  const parsed = JSON.parse(raw) as AgentMarketStore;

  // Lightweight migration safety for existing files.
  parsed.carts = parsed.carts ?? {};
  parsed.sessions = parsed.sessions ?? [];
  parsed.errorLogs = parsed.errorLogs ?? [];
  parsed.loopRuns = parsed.loopRuns ?? [];
  parsed.checkoutMetrics = parsed.checkoutMetrics ?? { totalCheckouts: 0, failedCheckouts: 0 };
  if (typeof parsed.promoBugFixed !== "boolean") parsed.promoBugFixed = false;

  return parsed;
}

export async function writeStore(store: AgentMarketStore): Promise<void> {
  await ensureStoreExists();
  await writeFile(getStorePath(), JSON.stringify(store, null, 2), "utf-8");
}

let writeQueue: Promise<unknown> = Promise.resolve();

export async function updateStore<T>(updater: (store: AgentMarketStore) => Promise<T> | T): Promise<T> {
  const run = writeQueue.then(async () => {
    const store = await readStore();
    const result = await updater(store);
    await writeStore(store);
    return result;
  });

  writeQueue = run.then(
    () => undefined,
    () => undefined
  );

  return run;
}

export async function resetStore(seed?: Partial<AgentMarketStore>): Promise<AgentMarketStore> {
  const base = defaultStore();
  const store: AgentMarketStore = {
    ...base,
    ...seed,
    carts: seed?.carts ?? base.carts,
    sessions: seed?.sessions ?? base.sessions,
    users: seed?.users ?? base.users,
    errorLogs: seed?.errorLogs ?? base.errorLogs,
    loopRuns: seed?.loopRuns ?? base.loopRuns,
    checkoutMetrics: seed?.checkoutMetrics ?? base.checkoutMetrics,
    promoBugFixed: seed?.promoBugFixed ?? base.promoBugFixed
  };

  await writeStore(store);
  return store;
}

export function createSessionToken(): string {
  return randomUUID();
}
