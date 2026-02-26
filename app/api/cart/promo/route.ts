import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "../../../../src/backend/auth/request";
import { setCartPromoCode } from "../../../../src/backend/services/cartStore";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  const formData = await request.formData();
  const promoCode = String(formData.get("promoCode") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/cart");

  if (!user) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(redirectTo)}`, request.url));
  }

  await setCartPromoCode(user.id, promoCode);
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
