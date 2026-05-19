import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // No critical services in this demo deploy:
  // - stack.database = none (Supabase skipped; frontend uses on-chain fallback)
  // - stack.auth = none (wallet IS auth, no off-chain provider)
  // - stack.analytics = posthog (placeholder, non-critical)
  //
  // Response is binary status only — no per-subsystem keys, no error details
  // (OWASP A4-InfoLeakage). Diagnostic details (if any) go to console.error.
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
