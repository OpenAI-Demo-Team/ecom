import { NextResponse } from "next/server";
import { readStore } from "@/src/backend/db/store";

export async function GET() {
  const store = await readStore();
  return NextResponse.json({ profiles: store.profiles });
}
