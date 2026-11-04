# Venue request templates in a declarative signing profile

The signing profile holds a template for every venue request the phone may sign. The phone renders each request from the template, the user's own inputs, and the few values only the Predict API knows. It then signs the request and sends it with the first call to the Predict API route. The Predict API renders the same request from the same profile and checks that the signature covers it.

Nothing asks "what do I sign?", so no route needs an error status for that. The profile is data that names allowlisted implementations shipped with the app, so client code stays venue-agnostic. The profile is bundled in the app today. Later it moves to a backend that is not the Predict API.

Status: accepted and implemented as of 2026-11-04, except the funding, withdrawal, compliance and `onboarding.resendMfa` operations, which are not built yet (see [Not yet built](#not-yet-built)). This replaces the `428 venue_signature_required` exchange and amends [ADR-0003](0003-backend-driven-venue-authentication.md). ADR-0003's trust model is kept: the phone signs only what its pinned profile allows, and it owns identity and freshness.

## Context

ADR-0003 has the Predict API build each venue request, and the phone check it against a pinned profile before signing. The current implementation of that has four problems.

1. **The 428 exchange misuses HTTP.**
   - Each signed route is first called without a signature and answers `428 Precondition Required` with the requests to sign.
   - RFC 6585 defines 428 for conditional requests (`If-Match`), not signature challenges.
   - The first call is not a mistake. It is a valid question, and it gets an error back.
   - The Predict API logs every 4xx at `error`, so each signed call adds an error to the logs.
2. **The client is not venue-agnostic.** Client code names Kalshi request refs. For example, `KalshiOnboardingClient.getStatus` passes `['balance', 'enrollment_current']`.
3. **The profile cannot describe most requests.**
   - `VenueSigningProfile` allows only string body fields equal to string inputs.
   - It has no integers or arrays, no path parameters, no constants, no mapped values, and no cost or proceeds bounds.
   - It also takes the authority, covered components and digests from the server, then re-checks them.
4. **The phone parses bytes it did not build.** Making that safe needs canonical-JSON, encoding and duplicate-key checks on every request. A request the phone renders itself is canonical by construction.

The authentication profile (`auth/venueAuthProfiles.ts`) has since become declarative. It selects an allowlisted implementation (`device-p256-salt-v1`) and supplies parameters. Remote configuration may choose a bundled profile but cannot change what an implementation does. The signing profile follows the same pattern.

## Decision

1. **The profile holds request templates.**
   - Each canonical Predict API operation, such as `portfolio.balance` or `onboarding.link`, names the venue requests it may send.
   - Each request template fixes the method and path, the query keys and body fields in order, and the source of every value.
2. **The phone renders, signs and sends on the first call.**
   - The client calls `signOperation` with the canonical operation, the user's inputs and any server values it received.
   - The phone renders the requests, checks the template's constraints and invariants, and signs.
   - The client sends the route call with a `Venue-Authorization` header. There is one round trip and no unsigned first call.
3. **The Predict API sends values, never request bytes.** Some values only the server knows:
   - an order's quoted price and contract count
   - a venue cursor or a `max_ts`
   - the venue order ID being reconciled
   - which step of a multi-step operation comes next

   The server returns these in its normal `200` responses, as named values. Each template declares which values it accepts and the shape of each one.

4. **The Predict API renders from the same profile.**
   - For the operations it serves, predict-api loads the same profile document the app bundles, and renders with the same rules.
   - It verifies that the signatures cover exactly the requests it rendered, then relays them.
   - The profile is the only description of the venue wire format. A shared fixture of inputs, values and expected bytes keeps the two renderers identical.
5. **Profiles are bundled now and move later to a backend that is not the Predict API.**
   - A remote profile must be signed by a MetaMask key the app pins, and carry a monotonic version.
   - It can reference only implementations and invariants the build bundles.
   - The phone never accepts a profile from the Predict API, which would let it write both the requests and the rules that approve them (ADR-0003, rejected alternative 2).
6. **Client code is venue-agnostic.** It names canonical operations and passes inputs and server values. It holds no venue paths, refs or field names.
7. **Phone-owned fields stay phone-owned.** The authority, covered components, `Content-Digest`, the A2T, the device key and salt, the request ID, `created` and `expires` come from the profile and the device. Every mutation's idempotency key is the phone's.

### Why templates and not a plan call

The alternative was an endpoint that answers `200` with the exact requests to sign. It would keep the wire format only in the Predict API, but it costs:

- a second round trip on every signed call
- a phone that has to parse and canonicalize server-built bytes
- a server-only artifact (the plan) that could never leave the Predict API

Templates move the wire format into the profile. That's the artifact that should end up in a separate backend anyway. Values only the server knows still come from the server, but as named, shape-checked inputs to rendering. They never arrive as bytes.

The costs:

- The Predict API must render with the profile instead of its own request builders.
- A venue wire-format change is a profile change. That needs an app release while profiles are bundled, and no release once they are remote.

## Signing profile

```ts
export interface VenueSigningProfile {
  readonly id: string; // 'kalshi-demo-signing-v2'
  readonly authenticationProfileId: string; // key slot and A2T, from venueAuthProfiles
  readonly implementation: {
    readonly id: 'device-p256-rfc9421-v1';
    readonly params: {
      readonly authority: string; // 'demo-api.kalshi.co'
      readonly label: string; // 'kalshi'
      readonly tag: string; // 'kalshi-device-request-v1'
      readonly lifetimeSec: number; // 60
      readonly tokenScheme: string; // 'Kalshi-A2T'
      readonly headers: { requestId: string; key: string; salt: string };
      readonly maxSignatures: number; // envelope bound, 8 or fewer
    };
  };
  readonly operations: Readonly<Record<CanonicalOperation, OperationRule>>;
  readonly requests: Readonly<Record<string, RequestTemplate>>;
}

interface OperationRule {
  readonly class: 'read' | 'mutation'; // a read operation never renders a mutation
  /** Steps the operation may take. Single-step operations have one, 'default'. */
  readonly steps: Readonly<Record<string, readonly StepRequest[]>>;
  readonly confirmation?: 'per-intent';
}

interface StepRequest {
  readonly request: string; // a key of `requests`
  readonly when?: Condition; // e.g. { input: 'action', equals: 'buy' }
}

interface RequestTemplate {
  readonly class: 'read' | 'mutation';
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly path: string; // '/trade-api/v2/portfolio/orders/{order_id}'
  readonly pathParams?: Readonly<Record<string, Source>>;
  readonly query?: readonly { key: string; value: Source; optional?: true }[]; // rendered in this order
  readonly body?:
    | 'empty'
    | { json: readonly { key: string; value: Source }[]; maxBytes: number };
  readonly idempotencyKey?: Source; // required for every mutation
  readonly invariants?: readonly { implementation: string; params: Json }[];
}
```

Every value comes from a closed set of sources implemented in the app:

| Source                   | Example                                                                                                                         | Rendered as                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `const`                  | `{ const: 'immediate_or_cancel' }`                                                                                              | That value                                  |
| `input`                  | `{ input: 'email' }`                                                                                                            | The user's own input                        |
| `input` with `transform` | `{ input: 'contracts', transform: 'decimal-fixed-2' }`                                                                          | The input through an allowlisted formatter  |
| `map`                    | `{ map: { inputs: ['action', 'outcome'], table: { 'buy:yes': 'bid', 'buy:no': 'ask', 'sell:yes': 'ask', 'sell:no': 'bid' } } }` | The table entry for those inputs            |
| `value`                  | `{ value: 'cursor', shape: { opaque: { maxLength: 512 } } }`                                                                    | A named server value, after its shape check |

Shapes are written as `{ kind, ... }`: `uuid-v4`, `int { min, max }`, `decimal { scale, min, max }` (a decimal string), `opaque { maxLength }` (a non-empty string), `oneOf { values }`, `array { of, maxItems }` and `time { unit, maxAgeSec, maxAheadSec }`. A time window is anchored to the phone clock. An `input` source takes a `transform` (`trim`, `decimal-fixed-2`, `decimal-fixed-4`) and an optional `shape`, and the shape describes the rendered value, after the transform. An optional query key is left out only when its input or value is absent. A value that is present and refused is always an error.

Rendering follows these rules:

- The query is `key=value` pairs in template order, percent-encoded to RFC 3986 unreserved characters. An optional key with no value is left out.
- The body is JSON with the template's keys in template order and the source's JSON type. It is serialized without whitespace and must be at most `maxBytes`.
- Path parameters are percent-encoded segments.

Both renderers follow these rules and are tested against the shared fixture.

Invariants are allowlisted checks that span fields. They return `display` values for the confirmation sheet. The first invariant is `binary-limit-order-v1`:

| Parameter                    | Value                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `pricing`                    | `'yes-leg'`. For NO, the body price is `1 − outcome price`, as in `acrossYesLeg` |
| `feeCeilingCentsPerContract` | The per-contract fee ceiling                                                     |
| `amountInput`                | `'amountCents'`                                                                  |
| `contractsInput`             | `'contracts'`                                                                    |
| `minOutcomePriceInput`       | Optional                                                                         |

It enforces, in integer ten-thousandths:

- **Buy:** `count × (outcomeLimit + feeCeiling) ≤ amount`.
- **Sell:** `count` equals the user's contracts, and `outcomeLimit` is at or above the user's floor when one is set.

It returns the max cost, the contract count and the minimum proceeds. Nothing in it is Kalshi-specific apart from its parameters.

### Confirmation

`confirmation: 'per-intent'` means the user must confirm on screen before the first signature for an intent. The intent is identified by the phone's idempotency key. When the phone first signs, it pins `idempotencyKey → { operation, inputs, values, bodyDigest, signCount, pinnedAt }` in an approved-intent ledger.

A later signature for the same key needs no new confirmation only if the rendered body is byte-identical, `signCount` is under the profile's limit (3 for orders), and the ledger entry hasn't expired. Anything else needs a new confirmation.

The ledger lives in SecureKeychain with a 30-minute TTL. It is cleared on lock, wallet reset and SRP change. While the wallet is locked, nothing is signed.

### Where profiles come from

| Stage   | Phone                                                                                                             | Predict API                                | Trust                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------- |
| Today   | Bundled in the app                                                                                                | The same document, from the shared fixture | The app release                        |
| Planned | Fetched from a profile service that is not the Predict API, and verified against a MetaMask key pinned in the app | Fetched from the same service              | The pinned key and a monotonic version |

The phone's copy is the security boundary. The Predict API's copy is only used for rendering. If the two disagree, the signatures don't verify. Nothing is signed that the phone's profile doesn't allow.

## Protocol

### Single-step operations

```ts
const auth = await signOperation({
  operation: 'onboarding.link',
  inputs: { email, idempotencyKey },
});
// → { name: 'Venue-Authorization', value: '<envelope>' }
```

```http
POST /v1/venues/kalshi/onboarding/link
Authorization: Bearer <MetaMask access token>
Venue-Authorization: <base64url JSON envelope>
Content-Type: application/json

{ "email": "user@example.com", "idempotencyKey": "…" }
```

The phone takes these steps:

1. Resolve the active profile.
2. Pick the operation's step. A single-step operation has one step, `default`.
3. Evaluate each request's `when` against the inputs.
4. Render each request.
5. Check its shapes and invariants.
6. Sign.

A refusal signs nothing and throws the rule id. The client shows a generic error and logs only the rule.

The envelope is `{ v, signingProfileId, step, credential, signatures }`. For `device-p256-rfc9421-v1`, `credential` is `{ a2t, deviceKey, salt }`, and each signature is `{ requestId, signatureInput, signature }`. A signature does not repeat the method, path, query, digest or idempotency key: predict-api renders the requests itself and pairs signature _n_ with request _n_, in the order the step's requests were rendered. The header name, `Venue-Authorization`, is the same for every venue.

The route then:

1. Resolves the step from durable state and the request.
2. Renders the step's requests from the same profile, inputs and values.
3. Verifies the credential and each signature against them.
4. Relays only those requests.

The route may send fewer of them than were signed, for example when it reuses an identical read that is in flight.

### Server values

When a request needs a value only the server knows, the server returns it in the `200` response that comes before the call:

| Response                        | Values                                                                           | Used by                             |
| ------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------- |
| Order preview                   | `price`, `count`                                                                 | `orders.commit`                     |
| Commit and observation receipts | `next: { step, values }`, for example `{ step: 'lookup', values: { order_id } }` | The next `orders.commit` call       |
| A paged or partial read         | `continuation: { token, step, values }`                                          | The next call of the same operation |

`token` is an opaque value the Predict API signs with its own key (HMAC). It carries the server's own state between calls, such as an Activity cursor or the running totals of a traversal. The client passes it back as an input, and the phone does not sign it. `values` are what the phone renders from.

### Pagination and multi-step operations

Pagination is expected for most account reads. A signature covers one exact request, so a venue cursor has to be known before the phone renders the request that uses it. Each call therefore performs one step. Its response carries the values for the next step, until there is no `continuation` or `next`.

- **Client-visible pages** (Activity, positions): the response's `continuation.values` carry the next venue cursor or `max_ts`. The template marks them as `value` sources with an `opaque` or `time` shape.
- **Server-side traversals** (a Summary over every holding): the same mechanism. A response with a `continuation` is a partial result, and the client keeps calling until it has none.
- **Durable multi-step resources** (order observation): the server reads progress from the database and names the next step and its values in the receipt.

The phone builds every page request itself from the template and the values it was given. Nothing is fetched just to learn what to sign.

### Errors

A signed route returns 4xx only when something is actually wrong:

| Status | Code                            | Meaning                                                                                                | Client                             |
| ------ | ------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| 400    | `venue_authorization_malformed` | The envelope does not parse                                                                            | Bug. `INVALID_RESPONSE`            |
| 403    | `venue_authorization_required`  | The route needs signatures and none were sent                                                          | Bug                                |
| 403    | `venue_authorization_invalid`   | The A2T or a signature failed verification                                                             | Drop the A2T and re-sign once      |
| 409    | `venue_signature_expired`       | The signatures are genuine but too close to expiry to relay                                            | Re-sign once                       |
| 409    | `venue_step_changed`            | Server state moved since the values were issued. The body carries the current `next: { step, values }` | Re-render from it and re-sign once |
| 403    | `venue_account_not_enabled`     | The venue says this profile has no enrolled account                                                    | Route to onboarding                |
| 502    | `venue_auth_rejected`           | The venue rejected a call the Predict API had verified                                                 | Generic error. Sentry              |
| 401    | `unauthorized`                  | MetaMask bearer token only. Unchanged                                                                  | `UNAUTHENTICATED`                  |

The phone refreshes the A2T before it expires, using the authentication profile's `refreshMarginSeconds`. Portfolio reads are gated on `onboarding.status`, so an unenrolled user doesn't reach `venue_account_not_enabled` in the normal flow.

### Server structure

Each signed route declares its canonical operation and a step resolver:

```ts
@VenueOperation('portfolio.balance')
@Get('balance')
balance(@VenueCalls() calls: VenueCallSet) {
  const [balance] = calls.prepare(); // renders, verifies, and returns the calls
}
```

- The guard resolves the step (`default`, unless the resolver reads one from durable state or a continuation token).
- The guard parses the envelope and verifies the A2T. A guard runs before body validation, so the handler passes its validated inputs and its server values to `calls.prepare({ inputs, values, step })`. That renders the step from the profile and verifies each signature against the rendered request.
- The handler can relay only what `prepare` returns, with the headers it returns. A template the profile cannot render from the validated inputs answers `400 venue_authorization_malformed`.
- Step resolvers read durable state only, never in-memory caches, so a step the server issued is the step it verifies.

### Adding an operation

New operations, such as deposits and withdrawals, need no framework change:

1. **Profile:** add the operation, its steps and its request templates.
2. **Predict API:** add the route, which declares the operation, and any server values it returns.
3. **App:** add a new invariant or source shape only if the constraints can't express a check. Add a new implementation only if the venue uses a different signature scheme.

The framework already supports:

- reads and mutations
- single-step and multi-step operations
- server values
- per-intent confirmation
- typed bodies (integers, arrays)

Calls that use the admin key, such as Kalshi's deposit indication and withdrawal, are outside it, because nothing is device-signed.

## Calls that act as the user

Each call below reads or changes the user's own venue account. Venue paths are under `/trade-api/v2`.

Market data is not user data and has no template. REST orderbooks, market snapshots, and `/historical/cutoff` are unsigned. The market-data WebSocket handshake uses the ISV admin key.

### Credentials

| Call                                                           | What it does                                                     | Design                                                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `POST /venues/kalshi/a2t/challenge`, `POST /venues/kalshi/a2t` | Issues the A2T that binds the device key to the MetaMask profile | Owned by the authentication profile. Moves to MetaMask Auth before production (A2T ADR) |

### Onboarding (Kalshi ISV enrollment)

| Operation             | Route                          | Venue request template                                          | Sources                                                       | Server values | Credential |
| --------------------- | ------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------- | ------------- | ---------- |
| `onboarding.status`   | `GET /onboarding/status`       | `GET /portfolio/balance`, `GET /isv/enrollment/intents/current` | None                                                          | None          | Device     |
| `onboarding.start`    | `POST /onboarding/intents`     | `POST /isv/enrollment/intents`                                  | Empty body. Idempotency key: `input`                          | None          | Device     |
| `onboarding.link`     | `POST /onboarding/link`        | `POST /isv/users/link`                                          | `email`: `input`                                              | None          | Device     |
| `onboarding.verify`   | `POST /onboarding/link/verify` | `POST /isv/users/link/verify`                                   | `code`: `input`                                               | None          | Device     |
| `onboarding.activate` | `POST /onboarding/activate`    | `POST /isv/wallet/register`                                     | `wallet_address`, `network`: `input`. Per-intent confirmation | None          | Device     |
| —                     | `POST /onboarding/demo-kyc`    | Admin-key ISV profile and KYC calls                             | Not device-signed. Demo only                                  | —             | Admin key  |

### Portfolio reads

| Operation             | Route                    | Venue request templates                                                                                                                                                                 | Server values                                                    | Credential |
| --------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------- |
| `portfolio.balance`   | `GET /balance`           | `GET /portfolio/balance`                                                                                                                                                                | None                                                             | Device     |
| `portfolio.positions` | `GET /positions`         | Step `holdings`: `GET /portfolio/positions?count_filter=position&limit=…[&cursor=…]`. Step `settlements`: `GET /portfolio/settlements?ticker=…&limit=10`, once for each resolved ticker | `cursor`, `tickers` (`array` of `opaque`, up to `maxSignatures`) | Device     |
| `portfolio.summary`   | `GET /portfolio/summary` | As positions, plus step `balance`: `GET /portfolio/balance`                                                                                                                             | As positions                                                     | Device     |
| `portfolio.activity`  | `GET /activity`          | `GET /portfolio/settlements?limit=200[&max_ts=…][&cursor=…]`, `GET /historical/positions?limit=1`                                                                                       | `max_ts` (`time`), `cursor` (`opaque`)                           | Device     |

Positions, Summary and Activity are multi-step. Each call performs one step and returns a `continuation` until the read is complete. A device-lane `permission_denied` on the settlements read means the route is not served on the device lane. Activity then returns Trades only and marks settlements as possibly missing.

### Trading

| Operation                     | Route                             | Venue request templates                                                                                                                                                                        | Server values                                                           | Credential                                               |
| ----------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| `orders.preview`              | `POST /orders/preview`            | Buy: `GET /portfolio/balance`. Sell: `GET /portfolio/positions?ticker=…&count_filter=position&limit=200`. New: `GET /isv/market-restriction?ticker=…`. The orderbook is market data            | None. The request carries the phone's `idempotencyKey`                  | Device. The orderbook is an unsigned public read         |
| `orders.commit`               | `POST /orders/commit`             | Step `submit`: re-check balance or position, then `POST /portfolio/events/orders`                                                                                                              | `price`, `count`, from the preview response                             | Device. `client_order_id` is the phone's idempotency key |
| `orders.commit` (observation) | `POST /orders/commit`, sent again | Step `submit`: the pinned body again. Step `lookup`: `GET /portfolio/orders/{order_id}`. Step `scan`: `GET /portfolio/orders?ticker=…&min_ts=…&limit=200[&cursor=…]`. Step `none`: no requests | `next: { step, values }` in the receipt: `order_id`, `min_ts`, `cursor` | Device                                                   |

The preview stores `client_order_id`, `price` and `count`, and returns `price` and `count`.

The `order_create` template, in order:

| Field                        | Source                                                               |
| ---------------------------- | -------------------------------------------------------------------- |
| `ticker`                     | `input: marketId`                                                    |
| `client_order_id`            | `input: idempotencyKey`, which is also the request's idempotency key |
| `side`                       | `map` over `action` and `outcome`                                    |
| `count`                      | `value: count`, `decimal { scale: 2, min: 1 }`                       |
| `price`                      | `value: price`, `decimal { scale: 4, min: 0.01, max: 0.99 }`         |
| `time_in_force`              | `const`                                                              |
| `self_trade_prevention_type` | `const`                                                              |

The template also sets `maxBytes: 1024` and has the invariant `binary-limit-order-v1`. The phone renders and checks it as soon as the preview arrives, and enables Confirm only if the check passes. The sheet renders from the invariant's `display`. The phone signs at Confirm. The preview stores the same `client_order_id`, `price` and `count`, so the commit renders the same bytes.

Order observation is stepped. Each call performs one step, and the receipt names the next one. A third verified absence re-arms the intent, and the next call submits. The phone stops after `MAX_COMMIT_OBSERVATIONS` (8) calls.

| Stored state                                 | Step this call                                                                  | After this call                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `pending` (crash before submit, or re-armed) | `submit`, with the pinned body. The ledger allows it without a new confirmation | `submitted`, or needs reconciliation                             |
| Needs reconciliation, venue order ID known   | `lookup`                                                                        | Resolved, or still reconciling                                   |
| Needs reconciliation, ID unknown             | `scan`. `min_ts` must fall within 10 minutes before `pinnedAt`                  | Next cursor stored. A fully scanned window counts as one absence |
| Third verified absence                       | `none`                                                                          | Re-armed to `pending`. The next call submits                     |
| Terminal                                     | `none`                                                                          | Receipt only                                                     |

Cancel, amend and decrease are not used, because every order is IOC. If they are added, they follow the same pattern, with per-intent confirmation and `order_id` taken from an order the user selected.

### Funding and withdrawals (not yet built, flow not decided)

These rows record what the ISV spec says, to show the framework can carry it. The product flow is still open.

| Operation                | Venue request                                                     | Credential                                             | Fits as                                                                                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `funding.depositAddress` | `POST /isv/deposit/crypto-addresses` `{ amount_cents, networks }` | Device. Admin key refused                              | Mutation. `amount_cents`: `input` (integer). `networks`: `input` (`array` of `oneOf`). Per-intent confirmation. Kalshi doesn't sign the returned address, so the relay can still replace it (ADR-0003 open question 1) |
| —                        | `POST /isv/deposit/indication`                                    | Admin key only                                         | Outside the framework                                                                                                                                                                                                  |
| `funding.payoutMethods`  | `GET /isv/wallet/payout-methods`                                  | Device                                                 | Read                                                                                                                                                                                                                   |
| `funding.transfer`       | `GET /isv/transfers/{transfer_id}`                                | Device or admin                                        | Read. `transfer_id`: `value`, `opaque`                                                                                                                                                                                 |
| —                        | `POST /isv/withdraw/crypto`                                       | Admin key only. The destination is fixed at activation | Outside the framework                                                                                                                                                                                                  |

How the user authorizes the admin-key-only calls is decided with those flows. One option is a device-signed consent that the Predict API checks before calling Kalshi.

The demo funding script (`scripts/kalshi-demo-fund.ts`) calls `crypto-addresses` with the admin key, following Kalshi's own example. The spec says that call is device-only, and the product route follows the spec.

### Compliance

| Operation                                             | Venue request                          | Credential                      | Fits as                 |
| ----------------------------------------------------- | -------------------------------------- | ------------------------------- | ----------------------- |
| Part of `orders.preview` and `funding.depositAddress` | `GET /isv/market-restriction?ticker=…` | Device, or admin with `user_id` | Read. `ticker`: `input` |
| `compliance.employmentForm`                           | `GET /isv/employment`                  | Device, or admin                | Read                    |
| —                                                     | `PUT /isv/employment`                  | Admin key only                  | Outside the framework   |

### Admin-only lookups and out of scope

These use the admin key and have no template:

- `GET /isv/enrollment/intents/by-external-id/{id}`
- `GET /isv/users/status/{user_id}`
- KYC, phone and document submission

Market streams are public. User websocket channels (fills, order updates) aren't used, and will be reviewed separately if Kalshi supports them for ISV users.

### Not yet built

These operations are specified by the profile design but not built. Each needs its own flow decision before it is added:

- `onboarding.resendMfa`, `POST /onboarding/link/challenge` to `POST /isv/users/link/challenge` with an empty body (ISV §5.6.1)
- The funding and withdrawal operations above
- The compliance employment form operations above

## Security

ADR-0003's assurance levels still apply. L1 (route, class, authority, lifetime) covers every request. L2 (bound fields) covers every mutation.

| Threat from a compromised Predict API                                           | Mitigation                                                                                                                                                                       |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| It gets an order signed when the user opened their portfolio                    | The client chooses the operation, and a `read` operation renders only `read` templates                                                                                           |
| It gets an extra or different request signed                                    | The phone renders every request from its own templates. The server supplies only named values, and each one is shape-checked                                                     |
| It serves its own profile                                                       | Profiles are bundled, or signed by a pinned MetaMask key. The Predict API never serves them                                                                                      |
| It forges the authority, components or digest                                   | All three come from the profile or the device                                                                                                                                    |
| It smuggles a field through encoding or JSON tricks                             | The phone renders bytes, so there is nothing to parse                                                                                                                            |
| It quotes a price or count so the user pays or receives more or less than shown | `binary-limit-order-v1` checks the rendered body against the user's amount, contracts and floor. The sheet renders from the invariant's `display`                                |
| It reuses a signature or re-submits an order                                    | The request ID is the nonce, a signature lives 60 seconds, mutations carry the phone's idempotency key, and the ledger allows only byte-identical re-signs, up to its sign count |
| It points a reconciliation read at another order                                | `order_id` is a server value with only a shape check. It is read-only, and a read reveals only the user's own data to a relay that already sees it                               |

What remains uncovered is the same as in ADR-0003: a forged catalog mapping, and venue responses that the venue doesn't sign, such as deposit addresses.

## Consequences

- Client code names canonical operations. Adding a venue means adding a profile, plus at most a new bundled implementation, source shape or invariant.
- Signed calls take one round trip, and no route answers 4xx in the normal flow.
- The profile is the single description of the venue wire format, and both repos render from it. Venue request builders for user-scoped calls are gone from the Predict API.
- Every signed route uses the profile. No route reads `KALSHI_HARDCODED_USER`.
- Both repos test their profile constant against the shared fixture `venue-signing-v2.json`. The fixture also holds one real device signature vector, which must verify on the server.
- Endpoints changed in place, with no version bump. There is no compatibility path for the `428` exchange.
- A Kalshi wire change is a profile change. While profiles are bundled, that means an app release.
- Multi-step operations take one call per step. The phone's observation loop stops at `MAX_COMMIT_OBSERVATIONS` (8).
- The `api-key` venue auth variant and the admin-key reads of user accounts are gone. `KALSHI_HARDCODED_USER` and `KALSHI_DEVICE_AUTHORITY` are gone. The authority is the profile's `implementation.params.authority`. The ISV admin key remains for the market-data WebSocket, demo KYC, deposit indication, and enrollment lookup by external id. REST market data and the historical cutoff are unsigned.
