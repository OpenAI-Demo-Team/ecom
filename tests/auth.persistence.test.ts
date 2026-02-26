import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authenticateUser, createSessionForUser, getUserFromSessionToken } from "../src/backend/auth/session";
import { readStore, resetStore } from "../src/backend/db/store";
import { addToCart, getCartSummary, setCartPromoCode } from "../src/backend/services/cartStore";

let tempDir = "";

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "stackstore-test-"));
  process.env.STORE_PATH = path.join(tempDir, "store.json");
  await resetStore();
});

afterEach(async () => {
  delete process.env.STORE_PATH;
  await rm(tempDir, { recursive: true, force: true });
});

describe("auth and persistence", () => {
  it("authenticates demo admin and resolves session user", async () => {
    const user = await authenticateUser("admin@stackstore.demo", "admin123");
    expect(user?.role).toBe("ADMIN");

    const token = await createSessionForUser(user!.id);
    const fromSession = await getUserFromSessionToken(token);

    expect(fromSession?.email).toBe("admin@stackstore.demo");
    expect(fromSession?.name).toContain("Admin");
  });

  it("persists cart lines and promo code", async () => {
    const user = await authenticateUser("buyer@stackstore.demo", "buyer123");
    expect(user).not.toBeNull();

    await addToCart(user!.id, "mecha-k1", 1);
    await setCartPromoCode(user!.id, "SAVE10");

    const summary = await getCartSummary(user!.id);
    expect(summary.lines).toHaveLength(1);
    expect(summary.promo?.code).toBe("SAVE10");

    const store = await readStore();
    expect(store.carts[user!.id]?.lines[0]?.sku).toBe("mecha-k1");
    expect(store.carts[user!.id]?.promoCode).toBe("SAVE10");
  });
});
