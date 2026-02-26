import { readStore, updateStore } from "../db/store";
import { getProductById } from "./catalog";
import {
  calculateCartSubtotal,
  calculateCartTotalWithFixState,
  type CartLine,
  type Promo
} from "./checkout";

export const PROMO_CODE = "AGENT10";

export type CartViewLine = CartLine & {
  name: string;
  imageUrl: string;
  category: string;
};

export type CartSummary = {
  lines: CartViewLine[];
  promo: Promo;
  promoCode: string | null;
  subtotalCents: number;
  totalCents: number;
  promoBugFixed: boolean;
};

export function resolvePromo(code: string | null | undefined): Promo {
  if (!code) return null;
  return code.trim().toUpperCase() === PROMO_CODE ? { code: PROMO_CODE, percentOff: 10 } : null;
}

export async function addToCart(userId: string, sku: string, qty = 1): Promise<void> {
  const product = getProductById(sku);
  if (!product) return;

  await updateStore((store) => {
    const cart = store.carts[userId] ?? { lines: [], promoCode: null };
    const existing = cart.lines.find((line) => line.sku === sku);

    if (existing) {
      existing.qty += qty;
      existing.unitPriceCents = product.priceCents;
    } else {
      cart.lines.push({
        sku,
        qty,
        unitPriceCents: product.priceCents
      });
    }

    store.carts[userId] = cart;
  });
}

export async function setCartPromoCode(userId: string, code: string): Promise<void> {
  await updateStore((store) => {
    const cart = store.carts[userId] ?? { lines: [], promoCode: null };
    cart.promoCode = code.trim().toUpperCase();
    store.carts[userId] = cart;
  });
}

export async function clearCart(userId: string): Promise<void> {
  await updateStore((store) => {
    store.carts[userId] = { lines: [], promoCode: null };
  });
}

export async function getCartSummary(userId: string): Promise<CartSummary> {
  const store = await readStore();
  const cart = store.carts[userId] ?? { lines: [], promoCode: null };

  const promo = resolvePromo(cart.promoCode);
  const lines: CartViewLine[] = [];
  for (const line of cart.lines) {
    const product = getProductById(line.sku);
    if (!product) continue;
    lines.push({
      ...line,
      name: product.name,
      imageUrl: product.imageUrl,
      category: product.category
    });
  }

  const subtotalCents = calculateCartSubtotal(lines);
  const totalCents = calculateCartTotalWithFixState(lines, promo, store.promoBugFixed);

  return {
    lines,
    promo,
    promoCode: cart.promoCode,
    subtotalCents,
    totalCents,
    promoBugFixed: store.promoBugFixed
  };
}

export async function ensureCartForUser(userId: string): Promise<void> {
  await updateStore((store) => {
    if (!store.carts[userId]) {
      store.carts[userId] = { lines: [], promoCode: null };
    }
  });
}
