import { NextResponse } from "next/server";
import { fetchTokenPrices } from "@/lib/prices";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Debug-only endpoint: returns what `fetchTokenPrices()` actually
// produces on the Vercel serverless runtime. Useful for diagnosing
// "did the fallback kick in?" issues from the browser without server
// access. Delete after the debug is done.
export async function GET() {
  const t0 = Date.now();
  const prices = await fetchTokenPrices();
  const elapsed = Date.now() - t0;
  return NextResponse.json({ elapsed_ms: elapsed, prices });
}
