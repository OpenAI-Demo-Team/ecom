import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "../../../../src/backend/auth/request";
import { addToCart, ensureCartForUser } from "../../../../src/backend/services/cartStore";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  const formData = await request.formData();
  const sku = String(formData.get("sku") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/products");

  if (!user) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(redirectTo)}`, request.url));
  }

  await ensureCartForUser(user.id);
  if (sku) await addToCart(user.id, sku, 1);

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
