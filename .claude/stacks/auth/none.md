---
assumes: []
packages:
  runtime: []
  dev: []
files: []
env:
  server: []
  client: []
ci_placeholders: {}
clean:
  files: []
  dirs: []
gitignore: []
demo_mode:
  # No off-chain auth — `wallet` is the only identity. Slot-intent consumers
  # treat all behaviors as reachable in DEMO_MODE because there is no role
  # claim to gate against.
  demo_mode_role: null
  demo_user_metadata: {}
---
# Auth: None
> Used when experiment.yaml has `stack.auth: none`
> Assumes: None

This stack file is a deliberate **no-op** for projects where authentication is handled outside the canonical (Supabase) auth flow. It exists to give `validate-experiment.py` and `scaffold-libs` a file to read so the bootstrap pipeline does not fall back to "general knowledge" assumptions about a missing auth stack.

The canonical use case is **wallet-as-auth** (web3 projects): the user's connected wallet address IS the identity, and there is no email/password, no OAuth, no session cookies issued by the app. See `.claude/stacks/web3/evm.md` for the wallet-auth pattern that pairs with this stack.

## Packages
None — nothing to install.

## Files to Create
None.

This stack does NOT scaffold:
- `src/app/login/page.tsx` — there is no login form.
- `src/app/signup/page.tsx` — there is no signup form.
- `src/app/auth/callback/route.ts` — there is no PKCE/OAuth callback.
- `src/middleware.ts` (auth-protecting) — route protection is handled client-side via the wallet-connected state.
- `src/components/nav-bar.tsx` (auth-aware variant) — nav is rendered with wallet connect button instead, owned by the web3 stack.

If a project needs ANY of those files, it has implicit authentication needs and should NOT use `stack.auth: none` — set `stack.auth: supabase` (or a future provider) instead.

## Environment Variables
None.

## Patterns

### Identity model
- **There is no server-issued session.** Anything an API route needs to know about the caller must be derived from a **per-request signed message** (SIWE / Sign-In With Ethereum) that the route verifies with `viem`'s `verifyMessage`.
- **Never trust a wallet address from a request body or header.** The only trustworthy address is one extracted from a verified signature in the same request, OR one stored in a short-lived signed httpOnly cookie that the auth handshake produced.
- **API routes that mutate state on behalf of a wallet** must run a SIWE handshake first (one extra round-trip), then issue a signed cookie pinning `wallet_address` for subsequent requests in that session.

### Page protection
- Pages that show personalized content (e.g., `/profile`) are **rendered client-side** based on `useAccount()` from wagmi.
- A user without a connected wallet sees an empty/connect-prompt state instead of a 401 redirect.
- This is intentional — wallet auth has no "logged out" concept the way cookie auth does. The wallet is connected or it isn't, and the UI reflects that locally.

### `behavior.anonymous_allowed`
With `auth: none`, every page is effectively anonymous-allowed at the routing layer (no middleware auth check). The schema field still matters: it tells consumers (e.g., funnel tests) that the page does not require a connected wallet to render meaningful content. Pages NOT marked `anonymous_allowed: true` show wallet-prompt empty states until a wallet connects, but they are never network-redirected.

## Assumes
None. This stack file deliberately depends on nothing — it is the absence of an auth provider, not the presence of one.

## Compatibility

| Other stack | Compatible? | Notes |
|---|---|---|
| `database: supabase` | Yes | Supabase is used as the database only; row-level access control should be keyed on `wallet_address`, not Supabase `auth.uid()`. |
| `database: sqlite` | Yes | Same — wallet address is the user identifier. |
| `payment: stripe` | No | Stripe checkout requires a server-issued customer identity. Use `auth: supabase` if you need fiat payments. |
| `web3/evm` (custom) | Required pairing | This stack is the auth-side companion to `web3/evm`. Without one of them, the project has no identity model at all. |
| `testing: playwright` | Mismatch (warning) | The Playwright stack file declares `assumes: [auth/supabase]` because its default fixtures cover login flows. With `auth: none`, those auth-tied test fixtures are skipped — Playwright still runs page-load smoke tests and behavior tests for `anonymous_allowed` pages. The "assumes mismatch" warning is non-blocking. |

## Stack Knowledge

### When an API route in an `auth: none` project needs to know who the caller is
The wallet address from `useAccount()` lives client-side. Sending it as a body field or header is unauthenticated — anyone can claim any address. Two correct patterns:

1. **One-shot SIWE per request.** The client signs a SIWE message containing the route name and a server-issued nonce; the route verifies the signature with `viem.verifyMessage()`. Higher latency, no session state.

2. **SIWE handshake + signed cookie.** A `/api/auth/siwe` route verifies the signature once and sets a short-lived httpOnly cookie (HMAC-signed with `AUTH_COOKIE_SECRET`, payload = `{address, expiresAt}`). Subsequent routes read and verify the cookie. Lower latency, expires on schedule.

Both patterns are provided by `.claude/stacks/web3/evm.md` when the project pairs `auth: none` with `web3/evm`. If the project uses `auth: none` without a wallet stack, it has no identity verification mechanism — that is almost always a mistake.

### When a page shows personalized data without `anonymous_allowed: true`
The page is reachable (no middleware redirect) but renders an empty/connect-prompt state for visitors without a connected wallet. This is the intended pattern — the missing wallet is shown as a UX state, not as a 401. Don't try to add server-side wallet checks to gate the page; the wallet only exists in the browser.

## PR Instructions
None — this stack creates no files and configures no external services.
