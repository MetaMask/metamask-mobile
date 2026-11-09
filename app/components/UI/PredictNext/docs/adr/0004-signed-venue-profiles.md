# Signed venue profiles on the phone: reads proposed by the server, mutations rendered on the phone

The phone signs every Venue request with its device key, under a signing profile that ships with the app. For trading reads, the Predict API proposes the exact request bytes and an HMAC-bound proposal token; the phone verifies the proposal against its profile copy, signs, and the API relays. For mutations, the phone renders the request from its profile and signs the rendered bytes; the Predict API never builds a Venue request body.

Status: accepted, 2026-11-09. Implements the trading half of PRED-1372. Replaces the trading portions of [ADR-0003](./0003-backend-driven-venue-authentication.md); onboarding keeps ADR-0003's backend-built request model until Universal KYC replaces those temporary, demo-only flows.

## Context

ADR-0003 settled that the Predict API builds every account-scoped Venue request and relays the phone's signature byte for byte. Two things changed since:

1. **Kalshi shipped the V2 trading API.** Reads (`orderbook`, `positions`, `balance`, `activity`) and the order-create call are documented endpoints with stable shapes. The mobile app needs paginated reads with interactive latency, and the spike (mobile #38300, api #67) proved the backend-built-read model adds a full round trip per page with no security gain: a read reveals nothing the profile's read allowlist does not already expose.
2. **The signing profile is now a signed document** with an allowlist of read patterns and per-intent payload kinds. The phone's copy is the security boundary; the Predict API loads the same document only to know what it may propose and to verify envelopes.

The conflict ADR-0003 resolved — the signature must prove what the phone *meant*, not just that the app was open — does not depend on who builds the bytes. It depends on the phone checking the bytes against pinned data before signing. That check now runs for server proposals (reads) and phone-rendered requests (mutations) alike.

## Decision

1. **Envelope v1 (`kalshi-envelope-v1`)** for trading: `{v:1, profile:{id,version}, credential:{a2t,deviceKey,salt}, signatures:[{requestId,signatureInput,signature}]}`, exactly one signature, base64url JSON in the `Venue-Authorization` header. Onboarding keeps its own `v:2` format untouched; unrelated version constants (`/trade-api/v2`, persisted-key v2, `polymarket.order.v2`) are unaffected.
2. **Reads are server-proposed.** The first call is bearer-only; the API replies 200 with `{kind:'sign_required', proposalToken, proposed:{method,path,query}}`. Never a 4XX: a signature request is a normal response state, not an error. The phone checks `method`/`path`/`query` against its profile's read allowlist on the *proposed bytes*, signs the proposed URL, and re-calls with `Venue-Authorization` plus the `venue-proposal` header carrying the token. The token is `base64url(proposal) + '.' + base64url(HMAC-SHA256(proposal))` under a dedicated `VENUE_PROPOSAL_HMAC` secret — never derived from the A2T issuer key. The API verifies MAC and expiry, rebuilds the base from the token, and relays. A 403 `invalid` proposal response invalidates the A2T and retries once; 409 expired keeps it.
3. **Pagination is a plain top-level `next` token** in the read result. The phone repeats phase 1 with `?next=`, up to 25 signed page calls. One venue read per API route call; the API maps and returns one page.
4. **Mutations are phone-rendered.** `order.place` renders `create_order` from the profile payload with `{inputs, values}`; `confirmed` is a boolean; `values` never serialize into the signed bytes. The commit route field-checks the signed body's `client_order_id`, `venue_price`, and `venue_count` against the confirmed preview row and refuses mismatches with 403 `venue_preview_mismatch`.
5. **Signatures are ES256, raw `r||s` (64 bytes, standard base64)** over the exact payload string, `ieee-p1363` at the Node side; `Signature-Input` label `kalshi`, tag `kalshi-device-request-v1`; the covered header set for GET is `@method @authority @path @query authorization kalshi-device-request-id kalshi-device-key kalshi-device-key-salt`, POST adds `content-digest content-type idempotency-key`; `nonce` in the signature params equals `requestId` (UUID v4).
6. **Preview stays bearer-only.** The envelope exists only on commit (`order.place`) and `account.activate`.
7. **Reconciliation scans are server-internal** under the ISV-signed lane; the phone is never asked to sign a scan. `needs_manual_review` stops reconciliation when the scan window (2400 s) closes; the receipt names no further step.

## Alternatives rejected

- **Keep ADR-0003's backend-built reads for trading.** It doubles latency per page and the allowlist already bounds what reads can touch; the phone still checks every proposal.
- **Derive the proposal MAC from the A2T issuer private key.** Mixes concerns: proposal binding is a predict-api internal; the issuer key must never sign anything but A2Ts.
- **Phone-side pagination cursors stored server-side.** The spike's `reconciliationCursor` column died with this decision; server-internal scans need no cross-call cursor state.
- **base64url profile payloads.** The document envelope standardizes on standard base64 from day one to avoid a second decoder path; base64url remains only for the envelope header and proposal token, which never meet the profile payload.

## Consequences

- The phone's generic signer gains `signRead(proposed)`; intents stay mutations-only. Commit signing sends no proposal header.
- The Predict API owns two read lanes: bearer (preview, onboarding probes) and proposed-signed (trading reads). Both are allowlisted from the same profile document.
- Onboarding flows still run on ADR-0003's model and the `v:2` envelope; they are temporary and demo-only, and Universal KYC replaces them.
