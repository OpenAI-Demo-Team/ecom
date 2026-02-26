export type MockStripeChargeInput = {
  amountCents: number;
  currency: "usd";
  sourceToken: string;
};

export type MockStripeChargeResult = {
  id: string;
  status: "succeeded" | "failed";
  declineCode?: string;
};

export async function createMockCharge(input: MockStripeChargeInput): Promise<MockStripeChargeResult> {
  if (input.sourceToken.startsWith("tok_fail")) {
    return { id: `ch_${Date.now()}`, status: "failed", declineCode: "card_declined" };
  }

  return { id: `ch_${Date.now()}`, status: "succeeded" };
}
