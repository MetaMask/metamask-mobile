# Signed venue profiles on the phone: reads proposed by the server, mutations rendered on the phone

The phone signs every Venue request with its device key, under a signing profile that ships with the app. For trading reads, the Predict API proposes the one venue GET a route needs; the phone checks it against its profile copy, signs, and re-calls the route naming the GET it signed; the API checks, verifies and relays. Nothing is kept between the two calls. For mutations, the phone renders the request from its profile and signs the rendered bytes; the Predict API never builds a Venue request body.

Status: accepted, 2026-11-09. Implements the trading half of PRED-1372. Replaces the trading portions of [ADR-0003](./0003-backend-driven-venue-authentication.md); onboarding keeps ADR-0003's backend-built request model until Universal KYC replaces those temporary, demo-only flows.

## Context

ADR-0003 settled that the Predict API builds every account-scoped Venue request and relays the phone's signature byte for byte. Two things changed since:

1. **Kalshi shipped the V2 trading API.** Reads (`orderbook`, `positions`, `balance`, `activity`) and the order-create call are documented endpoints with stable shapes. The spike (mobile #38300, api #67) built reads as server-driven operations and steps with client step memory; a read reveals nothing the profile's read allowlist does not already expose, so an L1 allowlist check is enough and the step machinery is not.
2. **The signing profile is now a signed document** with an allowlist of read patterns and per-intent payload kinds. The phone's copy is the security boundary; the Predict API loads the same document only to know what it may propose and to verify envelopes.

The conflict ADR-0003 resolved — the signature must prove what the phone _meant_, not just that the app was open — does not depend on who builds the bytes. It depends on the phone checking the bytes against pinned data before signing. That check now runs for server proposals (reads) and phone-rendered requests (mutations) alike.

## Decision

1. **Envelope v1 (`kalshi-envelope-v1`)** for trading: `{v:1, profile:{id,version}, credential:{a2t,deviceKey,salt}, signatures:[{requestId,signatureInput,signature}]}`, exactly one signature, base64url JSON in the `Venue-Authorization` header. Onboarding keeps its own `v:2` format untouched; unrelated version constants (`/trade-api/v2`, persisted-key v2, `polymarket.order.v2`) are unaffected.
2. **Reads are server-proposed and stateless.** The first call is bearer-only; the API replies 200 with `{kind:'sign_required', request:{method,path,query}}`. Never a 4XX: a signature request is a normal response state, not an error. The Engine signer (`PredictDeviceAuthService.signRead`) is the boundary: it signs only a GET matching the profile's `reads.allow`, within `maxPathLength` and a 2048-byte query, in plain URI characters, with no dot segments. The phone re-calls the same route with `Venue-Authorization` plus `venue-read: <path>?<query>` naming the GET it signed. The API checks those coordinates against the allowlist and against what the route expects from its own inputs, verifies the A2T and the signature, and relays. Unexpected coordinates get a fresh `sign_required`; the phone signs at most twice per read. A 403 `venue_authorization_invalid` drops the A2T and retries once; 409 `venue_signature_expired` keeps it. There is no proposal token and no server-side run state, so any API instance serves either call.
3. **One venue read per route call.** Pagination is the route's own cursor: each page is a new two-phase read. Positions and the Summary value one holdings page (the venue cap); Activity reads the settlements below its cursor. The Summary route returns the holdings totals; the phone adds the Balance route's value.
4. **Mutations are phone-rendered.** `order.place` renders `create_order` from the profile payload with `{inputs, values}`; the signed body is exactly the payload's fields. It is the whole body of `POST /venues/kalshi/orders/{previewId}/commit` and is relayed to Kalshi unchanged. The commit route field-checks `ticker`, `client_order_id`, `side`, `count` and `price` against the stored quote and refuses mismatches with 403 `venue_preview_mismatch`. The invariant (`binary-limit-order-v1`) runs on the phone before signing; its figures (maximum cost, minimum proceeds, contracts) are what the approval screen shows, and Approve stays disabled until they are known. The buy quote is sized so its signed worst case, every contract at the limit plus the fee ceiling, fits the amount the user entered.
5. **Signatures are ES256, raw `r||s` (64 bytes, standard base64)** over the exact payload string, `ieee-p1363` at the Node side; `Signature-Input` label `kalshi`, tag `kalshi-device-request-v1`; the covered header set for GET is `@method @authority @path @query authorization kalshi-device-request-id kalshi-device-key kalshi-device-key-salt`, POST adds `content-digest content-type idempotency-key`; `nonce` in the signature params equals `requestId` (UUID v4).
6. **Preview stays bearer-only.** The envelope exists only on commit (`order.place`) and `account.activate`.
7. **Commit is signed once; observation reads.** `GET /venues/kalshi/orders/{previewId}` returns the receipt bearer-only. While an ambiguous submission is reconciled it answers `sign_required` with a `GET /portfolio/orders` scan of the operation's ticker and window, which the phone signs like any read. Three verified absences after a 60 s grace resolve the operation as `not_filled`; it is never resubmitted. `needs_manual_review` ends reconciliation when the window (2400 s) closes. The approved-intent ledger (`signLimit: 3`) therefore covers one Commit and one renewal.

## Alternatives rejected

- **Keep ADR-0003's backend-built reads for trading.** It doubles latency per page and the allowlist already bounds what reads can touch; the phone still checks every proposal.
- **An HMAC proposal token and server-side multi-read runs.** Tried on this branch and removed: the token added a secret and an expiry to manage, and an in-memory run store broke behind more than one API instance. The route can recompute what it expects, so the phone naming the GET it signed is enough.
- **Observing an order by re-POSTing the Commit.** Every re-POST needed a new signature and exhausted the ledger; a read never submits.
- **base64url profile payloads.** The document envelope standardizes on standard base64 from day one to avoid a second decoder path; base64url remains only for the envelope header and proposal token, which never meet the profile payload.

## Consequences

- The phone's generic signer gains `signRead(proposed)`; intents stay mutations-only.
- Read-path checks inspect decoded segments as well as the signed bytes: dot segments, encoded separators, malformed escapes and nested escapes are refused. Ordinary escaped identifier characters remain allowed; query encoding is unchanged.
- The Engine Order client delegates `PredictDeviceAuthService:signRead` alongside mutation signing so receipt observation and reconciliation scans use the same read-signing boundary as portfolio reads.
- The Predict API owns two read lanes: bearer (preview, onboarding probes) and proposed-signed (trading reads and reconciliation scans). Both are allowlisted from the same profile document.
- The profile's readable source (`kalshi-trading-1.profile.json` in predict-api) is reviewed in git; `yarn venue-profile:sign` produces the document, and parity tests in predict-api pin the payload to that source.
- Onboarding flows still run on ADR-0003's model and the `v:2` envelope; they are temporary and demo-only, and Universal KYC replaces them.
