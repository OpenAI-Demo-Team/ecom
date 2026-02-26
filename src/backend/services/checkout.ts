export type CartLine = { sku: string; qty: number; unitPriceCents: number };
export type Promo = { code: string; percentOff: number } | null;

export function calculateCartSubtotal(cart: CartLine[]): number {
  return cart.reduce((sum, line) => sum + line.qty * line.unitPriceCents, 0);
}

export function getPromoDiscount(subtotalCents: number, promo: Promo): number {
  if (!promo) return 0;
  return Math.round((subtotalCents * promo.percentOff) / 100);
}

// DEMO BUG: discount is subtracted twice when a promo code is applied.
export function calculateCartTotal(cart: CartLine[], promo: Promo): number {
  const subtotal = calculateCartSubtotal(cart);
  if (!promo) return subtotal;

  const discount = getPromoDiscount(subtotal, promo);
  return subtotal - discount - discount;
}

export function calculateCartTotalFixed(cart: CartLine[], promo: Promo): number {
  const subtotal = calculateCartSubtotal(cart);
  const discount = getPromoDiscount(subtotal, promo);
  return subtotal - discount;
}

export function calculateCartTotalWithFixState(cart: CartLine[], promo: Promo, promoBugFixed: boolean): number {
  return promoBugFixed ? calculateCartTotalFixed(cart, promo) : calculateCartTotal(cart, promo);
}
