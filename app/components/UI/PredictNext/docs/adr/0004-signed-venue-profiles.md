# Signed venue profiles on the phone: reads proposed by the server, mutations rendered on the phone

The phone signs every Venue request with its device key, under a signing profile that ships with the app. For trading reads, the Predict API proposes the one venue GET a route needs; the phone checks it against its profile copy, signs, and re-calls the route naming the GET it signed; the API checks, verifies and relays. Reconciliation persists operation-bound scan progress; ordinary portfolio reads are stateless. For mutations, the phone renders the request from its profile and signs the rendered bytes; the Predict API never builds a Venue request body.

Status: accepted, 2026-11-09. Implements the trading half of PRED-1372. Replaces the trading portions of [ADR-0003](./0003-backend-driven-venue-authentication.md); onboarding keeps ADR-0003's backend-built request model until Universal KYC replaces those temporary, demo-only flows.

## Context

ADR-0003 settled that the Predict API builds every account-scoped Venue request and relays the phone's signature byte for byte. Two things changed since:

1. **Kalshi shipped the V2 trading API.** Reads (`orderbook`, `positions`, `balance`, `activity`) and the order-create call are documented endpoints with stable shapes. The spike (mobile #38300, api #67) built reads as server-driven operations and steps with client step memory; a read reveals nothing the profile's read allowlist does not already expose, so an L1 allowlist check is enough and the step machinery is not.
2. **The signing profile is now a signed document** with an allowlist of read patterns and per-intent payload kinds. The phone's copy is the security boundary; the Predict API loads the same document only to know what it may propose and to verify envelopes.

The conflict ADR-0003 resolved — the signature must prove what the phone _meant_, not just that the app was open — does not depend on who builds the bytes. It depends on the phone checking the bytes against pinned data before signing. That check now runs for server proposals (reads) and phone-rendered requests (mutations) alike.

## Decision

1. **Envelope v1 (`kalshi-envelope-v1`)** for trading: `{v:1, profile:{id,version}, credential:{a2t,deviceKey,salt}, signatures:[{requestId,signatureInput,signature}]}`, exactly one signature, base64url JSON in the `Venue-Authorization` header. Onboarding keeps its own `v:2` format untouched; unrelated version constants (`/trade-api/v2`, persisted-key v2, `polymarket.order.v2`) are unaffected.
2. **Reads are server-proposed.** The first call is bearer-only; the API replies 200 with `{kind:'sign_required', request:{method,path,query,requestId?}}`. A signature request is a normal response state, not an error. The Engine signer (`PredictDeviceAuthService.signRead`) signs only a GET matching the profile's `reads.allow`, within `maxPathLength` and a 2048-byte query; decoded dot segments, separators, malformed escapes and nested escapes are refused. An optional UUIDv4 `requestId` is signed as `kalshi-device-request-id` and the signature nonce; absent it, the phone generates its own ID. The phone re-calls the same route with `Venue-Authorization` plus `venue-read: <path>?<query>`. The API checks coordinates, A2T and signature before relay. The bound is **two signatures per attempt**, with at most one explicit renewal: 403 `venue_authorization_invalid` drops the A2T; 409 `venue_signature_expired` keeps it. A renewed attempt has its own two-signature budget. Exhaustion defers read work and preserves `requestSent: true`; it is not evidence that a mutation was never sent. Ordinary reads are stateless; reconciliation stores its expected cursor and request ID in the operation row so any API instance can verify progress.
3. **One venue read per route call.** Pagination is the route's own opaque cursor: each call is a new two-phase read. Positions and the Summary value one holdings page (the venue cap); the phone combines Summary holdings with Balance. Activity cursor v2 carries owner/venue scope, merge boundary, upstream scan/seek continuation and a bounded selection of settlement keys, not trusted account values. Arbitrarily ordered equal-timestamp records require signed scan/seek rereads before canonical emission. This trades worst-case $O(N \times \text{venue pages})$ rereads for bounded cursor memory and one venue GET per route call. Empty pages with `nextCursor` mean continue, not end. Old v1 cursors explicitly require restarting Activity. Demo-only permission degradation returns a reason; production denial remains an error.
4. **Mutations are phone-rendered.** `order.place` renders `create_order` from the profile payload; the signed body is exactly the payload's fields. It is the whole body of `POST /venues/kalshi/orders/{previewId}/commit` and is relayed to Kalshi unchanged. The commit route field-checks `ticker`, `client_order_id`, `side`, `count`, `price` and `reduce_only` against the stored quote and refuses mismatches with 403 `venue_preview_mismatch`. The `binary-limit-order-v1` invariant runs on the phone before signing and supplies the approval display. Buys show **Maximum cost (signed)**: all requested contracts at the limit plus the fee ceiling must fit the entered amount. Sells show **Proceeds if fully filled (signed)**: the full-count price-floor/fee calculation is conditional, and partial or no IOC fill produces less or no proceeds. The signed math is unchanged. Profile version 2 maps `reduce_only` to `true` for sells and `false` for buys; the phone invariant enforces it. Kalshi's [Create Order V2 contract](https://docs.kalshi.com/api-reference/orders/create-order-v2) caps a reduce-only IOC at the current Position, so Cash Out cannot open the opposite Position. API and mobile must carry matching trusted version-2 documents and keys.
5. **Signatures are ES256, raw `r||s` (64 bytes, standard base64)** over the exact payload string, `ieee-p1363` at the Node side; `Signature-Input` label `kalshi`, tag `kalshi-device-request-v1`; the covered header set for GET is `@method @authority @path @query authorization kalshi-device-request-id kalshi-device-key kalshi-device-key-salt`, POST adds `content-digest content-type idempotency-key`; `nonce` equals `requestId` (UUID v4). The API's shared parser accepts only the profile label's RFC 9421 Item `<label>=:<canonical-base64>:` with exactly 64 decoded bytes. Bare base64, noncanonical padding, extra labels/data and wrong labels are rejected before relay. This is syntax validation in addition to signature verification; changing an unsigned wrapper is not a signature forgery.
6. **Preview stays bearer-only.** The envelope exists only on commit (`order.place`) and `account.activate`.
7. **Commit is signed once; observation reads.** `GET /venues/kalshi/orders/{previewId}` returns the receipt bearer-only or proposes an operation-bound `GET /portfolio/orders` scan. The phone signs the challenge; the API persists the cursor and rotates the challenge atomically. Only complete scans from the first page count absences. Three completed absences after the 60 s grace can establish `not_filled`; exhausting a client budget, an observation 404, preview expiry or a local timer cannot. An ambiguous order is never resubmitted. `needs_manual_review` at the 2400 s reconciliation deadline means the outcome is unknown, not that it did not fill. The ledger's `signLimit: 3` is an approval-use cap, not a cryptographic replay defense: a new explicit confirmation can replace an exhausted pin. Server/venue idempotency is the replay boundary; automatic renewal must use `confirmed: false`.
8. **Product review/approval does not carry a venue DSL.** The service's
   `reviewPreview(venueId, previewId)` returns canonical `PredictOrderReview`
   fields: `{ previewId, maxCost, contracts, payout, proceedsIfFullyFilled }`.
   The view renders these fields, then calls `commitPreview` with explicit
   `{ kind: 'user-approved' }` only at the approval event. Neither interface
   accepts Kalshi template inputs, YES-leg pricing or Engine access through a
   generic view helper.

The Kalshi adapter pins quote parameters and rendering context under preview
identity, performs venue conversion and invariant review, then signs the same
exact bytes. Its pin store is expiry-pruned and bounded to 32 previews. Reusing
a preview ID with drifted quote/signing context rejects and discards the old pin;
it cannot replace an already reviewed body. Numeric Engine approval generation
fences pins/reviews across revocation; an A2T renewal is distinct and cannot
grant a new approval. Only the actual approval path mints `confirmed: true`;
renewal uses false. The service owns workflow, coalescing and the durable journal.
Restored recovery references never acquire user approval and can only observe,
even if a caller presents the approval event again.

## Alternatives rejected

- **Keep ADR-0003's backend-built reads for trading.** It doubles latency per page and the allowlist already bounds what reads can touch; the phone still checks every proposal.
- **An HMAC proposal token and in-memory multi-read runs.** A secret and expiry are unnecessary, and in-memory state breaks behind multiple API instances. Portfolio routes recompute expected coordinates. Reconciliation instead persists its cursor and a random signed request-ID challenge per operation, because absence requires proof of complete traversal and single-use pages.
- **Observing an order by re-POSTing the Commit.** Every re-POST needed a new signature and exhausted the ledger; a read never submits.
- **base64url profile payloads.** The document envelope standardizes on standard base64 from day one to avoid a second decoder path; base64url remains only for the envelope header, which never meets the profile payload.

## Consequences

- The phone's generic signer gains `signRead(proposed)`; intents stay mutations-only.
- Read-path checks inspect decoded segments as well as the signed bytes: dot segments, encoded separators, malformed escapes and nested escapes are refused. Ordinary escaped identifier characters remain allowed; query encoding is unchanged.
- The Engine Order client delegates `PredictDeviceAuthService:signRead` alongside mutation signing so receipt observation and reconciliation scans use the same read-signing boundary as portfolio reads.
- The Predict API owns two read lanes: bearer (preview, onboarding probes) and proposed-signed (trading reads and reconciliation scans). Both are allowlisted from the same profile document.
- The profile's readable source (`kalshi-trading-1.profile.json` in predict-api) is reviewed in git; `yarn venue-profile:sign` produces the document, and parity tests in predict-api pin the payload to that source.
- Onboarding flows still run on ADR-0003's model and the `v:2` envelope; they are temporary and demo-only, and Universal KYC replaces them.
- Temporary account-not-enabled handling is connected to the actual order flow's
  cached readiness gate; invalidating that readiness reopens onboarding. It is
  not an unused parallel hook or a second adapter composition root.

## Lifecycle and unresolved-order policy

These invariants govern approval authority and recovery independently of
transport retries or application process lifetime.

- Approval authority belongs to one unlocked, authenticated session generation.
  Lock, reset and identity/auth-profile replacement revoke it synchronously.
  A later unlock cannot reauthorize old work. Ledger claims recheck after every
  awaited write; mutation and read signing check captured generation/identity/
  key/profile after async preparation, before key use and before returning an
  envelope. Reset drops active state and the plaintext key before awaiting
  storage deletion. An uncancellable crypto operation may finish, but its
  revoked result cannot escape.
- Once a mutation may have been dispatched, failures to observe it remain
  **checking/unknown** until authoritative resolution. `operation_not_found`
  says there is no row at that instant; it cannot prove an earlier POST will not
  create one. A commit-only refusal is evidence about that invocation, not proof
  about an earlier ambiguous submission. Manual-review and confirmed zero-fill
  receipts have separate, exhaustive notification/display cases.
- Canonical backend codes take precedence over HTTP status: preview mismatch
  means refresh/review, unavailable signing means authentication is unavailable,
  and signing refusal has its own product error. Unknown coded 403 is not proof
  of geography. The API's typed error definitions generate a checked artifact;
  paired mobile contract verification requires explicit mapping/phase semantics
  when a backend code changes.
- Recovery merges the owner/venue-scoped unresolved-operation listing with a
  minimal durable device dispatch journal written before mutation dispatch.
  The journal records identity scope, venue, preview identity and recovery
  metadata, never A2Ts, signatures, private keys, envelopes or approved payloads.
  Relaunch/foreground/reconnect resume bounded, fair **observe-only** work while
  unlocked and authenticated. Budget exhaustion pauses, not forgets.
  Lock/signout cancel work without deleting unresolved financial history; wallet
  reset deletes that wallet's journal. Another identity cannot see or observe it.
  Pending/manual-review references remain visible with observe-only refresh;
  terminal cleanup prevents replaying old completion notifications.
  Reset fences work throughout journal clearing, not only before the first
  await. Identity changes and late discovery cannot resurrect a terminal result
  or replace a preserved manual-review marker with an unresolved entry.
- The worker conditionally flags stale unresolved operations
  `needs_manual_review`. It has no account credential, makes no venue call for
  this sweep, never submits, and cannot manufacture `not_filled`. A verified
  positive fill from the original submitted generation may still resolve and
  clear manual review if the sweep overtakes its signed scan. Absence/progress
  stays blocked after the flag; it cannot turn unknown into a negative receipt.
- Same-preview single-flight, atomic pre-sign ledger claims, exact signed bytes,
  owner isolation and durable signed scan progress remain required throughout
  these lifecycle changes.

Activity can intentionally return an empty nonterminal page while its bounded
scan/seek progresses. The mobile view retains an explicit **Load more** action
when `nextCursor` is present rather than rendering a false end or automatically
draining an unbounded page chain. It propagates the canonical cursor unchanged
through the service to the HTTP URL. Demo Trades-only responses show the
degraded reason so an empty result is not presented as complete venue history.

## Trust, compatibility and rollout

The envelope carries only the profile **id/version**. Each side loads and
verifies its own bundled document; the phone does not send a trusted document
for the API to execute. The API has no user-account credential fallback, and
the local mock forwards device authorization and body bytes unchanged.

Server profile admission uses an explicit exact `(id, version)` registry with
each accepted version's own trusted document. Version 99 cannot borrow version 2
rules. The initial accepted set is audited demo v2 only; unsafe v1 sells are not
re-enabled for compatibility. Old/revoked versions return non-renewable
`venue_profile_update_required`; unknown future versions return
`venue_profile_not_ready`. Emergency revocation overrides the compatibility
window. Before store release, the release owner must still establish production
trust, minimum supported versions, a dated sunset and coherent multi-instance
deployment.

A2T verification uses separately configured trusted **public JWKS**, issuer and
audience, selects an exact `kid`, and permits only ES256/P-256 public keys. The
temporary demo issuer may hold its own private key for minting; the trading
verifier does not derive trust from it or follow token-controlled key URLs.
Production trust/provisioning remains an operational release gate.

Verifier trust caches one immutable configuration snapshot: repeated requests
reuse parsed public keys, while changed issuer/JWKS/audience replaces the cache
rather than accumulating old rotations.

Device keys are currently scoped to the bundled authentication profile's key
slot, not a MetaMask user. Signout/profile switching retains that encrypted key;
reset deletes all bundled slots. Another device has its own key/A2T. Vendor
confirmation that one public device key can bind two distinct users is required
before real multi-user deployment; silently changing the slot would strand keys
and is not an approved migration.

Balance coalescing on the API (`sharedBalanceRead`) is a best-effort process-local
Map keyed by account and device, with a two-second successful-response window.
It is not cross-instance deduplication or a safety guarantee. Non-2xx results
are not reused and thrown failures remove their entry. The Summary combines
holdings with a separate balance read; if balance is rate-limited it must remain
unavailable rather than invent a zero, while independent Positions stay usable.

Keep PredictNext trading gated while the API/mobile `idempotencyKey` contracts
are skewed. Deploy matching schema, trusted profiles/keys, API, worker and
environment configuration before enabling compatible mobile builds. Do not omit
the required field as a workaround. Market-data WebSockets use a dedicated
credential pair and explicit enable switch, never the ISV admin pair or a user
account credential. Demo-only settlements degradation must not hide production
permission denial. No clock-skew or fee-ceiling policy change is decided here.

