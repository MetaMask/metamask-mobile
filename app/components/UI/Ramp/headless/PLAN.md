# Headless Buy — Incremental Plan

> Introduce a dev-only "Headless Buy" playground under Ramp Settings that consumes a new `useHeadlessBuy` hook, then incrementally evolve the Unified Buy v2 flow so external UIs can drive it end-to-end without the Ramp UI (skip token/amount screens, bypass the order-processing redirect, surface orderIds through callbacks).

## Phases checklist

- [x] **Phase 1** — Scaffold Headless Playground screen + route + entry row in Ramp Settings (gated by `isInternalBuild`)
- [x] **Phase 2** — Implement `useHeadlessBuy` v0 read-only facade (tokens, providers, payment methods, `getQuotes`) and wire playground inputs/quotes list
- [x] **Phase 3** — Add headless session registry + `startHeadlessBuy` API that navigates into existing BuildQuote with `headlessSessionId`
- [x] **Phase 3.1** — Move pre-seed out of `useHeadlessBuy` — keep params on the session only and let the destination resolve them from the catalog
- [x] **Phase 4** — Extract `handleWidgetProviderContinue` / `handleNativeProviderContinue` into `useContinueWithQuote(quote, ctx)` so both BuildQuote and headless callers can reuse it
- [x] **Phase 4b** — Introduce Headless Host screen as stack base for the headless flow + parameterize `useTransakRouting` reset helpers with `baseRoute`
- [x] **Phase 4c** — Make `useContinueWithQuote` headless-ready — extend `ContinueWithQuoteContext` with optional overrides so callers without controller state (the Host) can drive it from a `Quote`
- [x] **Phase 5 (revised)** — Quote-first headless start path — `startHeadlessBuy({ quote, redirectUrl? })` creates a session carrying the quote, navigates to Headless Host, Host calls `continueWithQuote(quote, ctx)` and re-orchestrates after auth loops
- [ ] **Phase 5b (deferred)** — `startHeadlessBuy({ assetId, amount, paymentMethodId, providerId? })` "open BuildQuote / Host fetches quotes" mode — picked up after the quote-first path is stable
- [ ] **Phase 6** — Bypass order-processing redirect in Transak/aggregator routing when headless; fire `onOrderCreated` and end session
- [ ] **Phase 7** — Extract UI-coupled error/limit surfacing; route errors through `onError` as typed `HeadlessBuyError`
- [ ] **Phase 8** — Cancellation + `onClose` semantics (including user-dismissed detection)
- [ ] **Phase 9** — Expose `getOrder` / `refreshOrder` from hook and show in playground
- [ ] **Phase 10** — Playground polish — event log, input persistence, aggregator/native presets

---

Each phase below is sized to be merged and tested independently. Scope is kept small per phase so we can pick them up one at a time, validate in the playground, and discover the refactors the mainstream flow needs along the way.

---

## Architecture at a glance

```mermaid
flowchart LR
    Caller["External UI / Playground Screen"] --> Hook["useHeadlessBuy()"]
    Hook -->|reads| Ctrl["useRampsController() tokens / providers / payment methods / quotes / orders"]
    Hook -->|startHeadlessBuy| Registry["headless session registry (sessionId → { onOrderCreated, onClose, onError })"]
    Hook -->|navigate| Flow["Unified Buy v2 stack (TokenListRoutes)"]
    Flow -->|aggregator| Checkout["Checkout WebView"]
    Flow -->|native| KycWebview["Email / KYC / Payment WebView"]
    Checkout -->|orderId| Registry
    KycWebview -->|orderId| Registry
    Registry -->|onOrderCreated| Caller
```

Key idea: the hook orchestrates by (a) storing attempt params + callbacks in the session registry, (b) navigating into the existing v2 screens with a `headlessSessionId` param, and (c) having existing routing callbacks detect the session and fire the callback instead of navigating to order-details. Controller selections are not written from `useHeadlessBuy` (Phase 3.1); the destination resolves ids from the catalog when needed.

---

## Phase 1 — Playground scaffolding (read-only)

Goal: land an empty playground screen wired to the existing `useRampsController`. No behavior changes.

- Add `Routes.RAMP.HEADLESS_PLAYGROUND = 'RampHeadlessPlayground'` in [app/constants/navigation/Routes.ts](../../../../constants/navigation/Routes.ts) (line ~8–22 block).
- Create `app/components/UI/Ramp/Views/HeadlessPlayground/HeadlessPlayground.tsx` — a plain `ScrollView` that renders the current `userRegion`, first 5 `tokens`, `providers`, `paymentMethods`, using the existing composition hook at [app/components/UI/Ramp/hooks/useRampsController.ts](../hooks/useRampsController.ts).
- Register screen in [app/components/Nav/Main/MainNavigator.js](../../../../Nav/Main/MainNavigator.js) next to the `RampSettings` registration (lines 491–500), no env gate on the stack itself — only the entry point is gated.
- Add entry row in [app/components/UI/Ramp/Aggregator/Views/Settings/Settings.tsx](../Aggregator/Views/Settings/Settings.tsx) next to `ActivationKeys` (lines 134–138), reusing the `isInternalBuild` guard:

```tsx
{
  isInternalBuild ? (
    <Row>
      <HeadlessPlaygroundLink />
    </Row>
  ) : null;
}
```

- Add i18n keys (`app_settings.fiat_on_ramp.headless_playground.*`) in [locales/languages/en.json](../../../../../../locales/languages/en.json).
- Unit tests: one render test for the new screen, one assertion in `Settings.test.tsx` that the row only renders when `isInternalBuild`.

---

## Phase 2 — `useHeadlessBuy` v0 (read-only facade)

Goal: expose a stable public API surface that only reads data. No side effects yet.

- Create `app/components/UI/Ramp/headless/` directory with:
  - `useHeadlessBuy.ts` — facade around `useRampsController` exposing: `tokens`, `providers`, `paymentMethods`, `userRegion`, `orders`, `getOrderById`, `getQuotes(params)`, `isLoading`, `errors`.
  - `types.ts` — `HeadlessBuyParams`, `HeadlessSession`, `HeadlessBuyResult`, `HeadlessBuyCallbacks`.
  - `index.ts` — barrel.
- `getQuotes(params)` wraps [app/components/UI/Ramp/hooks/useRampsQuotes.ts](../hooks/useRampsQuotes.ts) but accepts all inputs as arguments (assetId, amount, paymentMethodId, providerId, regionCode) so the caller does not need to pre-seed controller state.
- Wire the playground screen to render: region picker (from `countries`), token dropdown (from `tokens`), payment method dropdown, amount input, a "Get quotes" button, and a list of returned quotes.
- Unit tests around `useHeadlessBuy` (mock controller) asserting it forwards data correctly.

Deliverable: a dev can open Ramp Settings → Headless Playground, pick inputs, and see quotes. Nothing starts a real flow yet.

---

## Phase 3 — Headless session registry + Start API

Goal: define the lifecycle primitive that lets the existing flow fire a callback back to the consumer.

### Why a module-level registry (not Redux / not Context)

- Callbacks are functions — **not serializable**, so they can't live in Redux state or in route params.
- The lifetime is **per-attempt**, not per-app — Redux persistence would be wrong.
- Multiple consumers in different parts of the tree must all see the same session — Context wouldn't reach across navigators reliably.
- This is how MetaMask Mobile already handles "shared, ephemeral, non-serializable" state. Direct analog: [app/core/SDKConnectV2/services/connection-registry.ts](../../../../core/SDKConnectV2/services/connection-registry.ts) lines 63–87 (`private connections = new Map<string, Connection>()` plus `disconnect(id)` lifecycle). A second precedent is `@metamask/approval-controller` (`addApprovalRequest` / `acceptApproval`), used throughout [app/core/RPCMethods/RPCMethodMiddleware.ts](../../../../core/RPCMethods/RPCMethodMiddleware.ts) — same id-keyed "register a request, resolve it later from the UI" shape. The existing Ramp aggregator already does a smaller version of this with `customOrderId` + `getOrderFromCallback` in [app/components/UI/Ramp/Aggregator/Views/Checkout/Checkout.tsx](../Aggregator/Views/Checkout/Checkout.tsx) (line 21, 49, 74).

### End-to-end flow

```mermaid
sequenceDiagram
  participant Caller as External UI
  participant Hook as useHeadlessBuy
  participant Reg as sessionRegistry (module)
  participant Host as HeadlessHost screen
  participant Flow as Ramp v2 screens
  Caller->>Hook: startHeadlessBuy(params, { onOrderCreated, onClose, onError })
  Hook->>Reg: createSession(params, callbacks) returns sessionId
  Hook->>Host: navigate(HEADLESS_HOST, { headlessSessionId, ...params })
  Host->>Reg: getSession(headlessSessionId)
  Host->>Flow: continueWithQuote(quote)
  Flow-->>Host: reset to [HEADLESS_HOST, KycWebview]
  Flow->>Reg: getSession(id).callbacks.onOrderCreated(orderId)
  Reg-->>Caller: invokes callback
  Reg->>Reg: endSession(id)
```

The `sessionId` is the only thing that travels through navigation params; everything else (callbacks, status) is looked up by id at the point of use.

### Implementation

- Create `app/components/UI/Ramp/headless/sessionRegistry.ts`:
  - Module-level `Map<sessionId, HeadlessSession>`.
  - `createSession(params, callbacks): HeadlessSession`, `getSession(id)`, `setStatus(id, status)`, `endSession(id)`.
  - Session shape: `{ id, status: 'pending' | 'quoting' | 'continued' | 'completed' | 'cancelled', params, callbacks: { onOrderCreated, onClose, onError }, createdAt }`.
  - GC stale sessions (>1h) on each `createSession` to avoid leaks.
  - `getSession(undefined)` returns `undefined` (no-op) so call-sites can write `getSession(route.params?.headlessSessionId)?.callbacks.onOrderCreated(orderId)`.
- Extend `useHeadlessBuy` with:

```ts
startHeadlessBuy(
  params: HeadlessBuyParams,
  callbacks: HeadlessBuyCallbacks,
): { sessionId: string; cancel(): void }
```

- `params` include: `assetId`, `amount`, `paymentMethodId`, `providerId?`, `regionCode?`.
- Implementation (this phase only does the plumbing, no UI bypass yet):
  1. `createSession(params, callbacks)` returns `sessionId`.
  2. Add `headlessSessionId?: string` to `BuildQuoteParams` (BuildQuote.tsx line 112).
  3. Navigate to `BuildQuote` via `createBuildQuoteNavDetails({ assetId, amount, headlessSessionId })` from [app/components/UI/Ramp/Views/BuildQuote/BuildQuote.tsx](../Views/BuildQuote/BuildQuote.tsx) (lines 112–147) — i.e. reuse the existing entry.
- **Phase 3.1** superseded an earlier idea of pre-seeding RampsController from `startHeadlessBuy` — params stay on the session only; no controller writes from the hook (see Phase 3.1 section below).
- Unit tests around the registry (create/get/end, collisions, dangling sessions).

Deliverable: playground can call `startHeadlessBuy` and land on the BuildQuote screen (still the full UI) — validates plumbing without breaking anything.

---

## Phase 3.1 — Stop pre-seeding RampsController from `useHeadlessBuy`

Goal: fix a type/race bug introduced in Phase 3's pre-seed step and keep the hook free of controller side-effects.

The Phase 3 implementation called `setSelectedPaymentMethod(params.paymentMethodId)` and `setSelectedProvider(params.providerId)` from `startHeadlessBuy`. Two problems:

1. **Type mismatch** — `setSelectedPaymentMethod(paymentMethod: PaymentMethod | null)` ([useRampsPaymentMethods.ts:32](../hooks/useRampsPaymentMethods.ts#L32)) and `setSelectedProvider(provider: Provider | null, opts?)` ([useRampsProviders.ts:37](../hooks/useRampsProviders.ts#L37)) take **full objects**, not ids. `setSelectedToken(assetId: string)` is the only id-based setter ([useRampsTokens.ts:26](../hooks/useRampsTokens.ts#L26)).
2. **Catalog hydration race** — at the moment `startHeadlessBuy` runs, `paymentMethods` / `providers` may still be loading, so even an id→object lookup can't always resolve.

Both go away if we never write to the controller from the hook:

- Drop `setSelectedToken` / `setSelectedProvider` / `setSelectedPaymentMethod` / `setUserRegion` calls from `startHeadlessBuy`.
- Keep the params on the `HeadlessSession` only — the session is already the source of truth.
- The destination screen (BuildQuote today, Headless Host in Phase 4b) resolves `paymentMethodId` / `providerId` against its own catalog queries and calls the setters with full objects, where it knows the data is hydrated.

Tests: replace "pre-seeds the controller" assertions with "writes the params onto the session" / "does not call any controller setter" assertions. `useHeadlessBuy` no longer needs setters in its destructure.

Deliverable: the bug is fixed without changing the public API; downstream phases can rely on `getSession(sessionId).params` instead of mutating controller state from outside.

---

## Phase 4 — Extract continue-with-quote logic (refactor)

Goal: make the "what to do after we have a quote" logic reusable outside the `BuildQuote` component, by both BuildQuote (with its own `selectedQuote`) and headless callers (with a `Quote` they hand in directly — see Phase 5b).

- Extract from [app/components/UI/Ramp/Views/BuildQuote/BuildQuote.tsx](../Views/BuildQuote/BuildQuote.tsx):
  - `handleWidgetProviderContinue` (lines ~700–821, aggregator path → Checkout WebView / InAppBrowser).
  - `handleNativeProviderContinue` (lines ~636–681, native Transak path).
- Move into `app/components/UI/Ramp/hooks/useContinueWithQuote.ts`:

```ts
useContinueWithQuote(): {
  continueWithQuote: (quote: Quote, context: { amount: number; assetId: string }) => Promise<void>;
}
```

- Internally delegates to existing [app/components/UI/Ramp/hooks/useTransakRouting.ts](../hooks/useTransakRouting.ts) and aggregator widget logic.
- Refactor `BuildQuote` to use the new hook — identical behavior.
- Both the BuildQuote screen AND `useHeadlessBuy` will call `useContinueWithQuote` from the next phase on.
- Update/add unit tests so BuildQuote tests keep passing and `useContinueWithQuote` is covered.

No user-visible change — purely a refactor to unblock Phase 5.

---

## Direction change after Phase 4 (Apr 2026)

> Codifies the "headless start now requires a `Quote`" pivot agreed with product.

Originally Phase 5 had the Headless Host fetch quotes for the consumer; Phase 5b was a follow-up where the consumer hands in a pre-selected quote. We're flipping the order: **Phase 5 (revised) is now the quote-first start path** and the original Phase 5 ("Host fetches quotes and auto-picks") is renamed to Phase 5b and deferred until quote-first is stable.

Why:

- Consumers already have `useHeadlessBuy().getQuotes(...)` from Phase 2, so they can pair it with their own selection UI today. Asking them to re-derive `assetId` / `paymentMethodId` / `providerId` from a chosen `Quote` only for the Host to fetch quotes again is busywork.
- The `Quote` carries every piece of context `continueWithQuote` needs (provider, payment method, fiat amount, asset, currency hints), so the Host can route directly without controller pre-seeding (Phase 3.1 already removed that coupling).
- Smaller, shippable surface — the Host only needs to read `session.params.quote` and call into the Phase 4 hook. Quote selection logic stays out of the Ramp internals.

Implications threaded into the phases below:

- **Phase 4b** — Host params drop `assetId / amount / paymentMethodId / providerId` (replaced by the `quote` on the session). Old shape kept in this doc for the deferred Phase 5b but marked superseded.
- **Phase 4c (new)** — `useContinueWithQuote` currently relies on `selectedToken / selectedProvider / selectedPaymentMethod / userRegion / useRampAccountAddress(selectedToken.chainId)` (see [useContinueWithQuote.ts:67–98](../hooks/useContinueWithQuote.ts#L67-L98)). The Host has none of those — extend `ContinueWithQuoteContext` with optional overrides so the Host can pass them explicitly while BuildQuote continues to fall back to the controller.
- **Phase 5 (revised)** — `startHeadlessBuy({ quote, redirectUrl? }, callbacks)` becomes the only public start API for now. Session payload changes from raw params to `{ quote, redirectUrl? }`. Navigation jumps straight to Headless Host with `headlessSessionId`.
- **Phase 8** — Starting a new headless session while one is active **automatically cancels** the previous session (registry helper). The playground exercises this by exposing per-quote Start buttons.
- **Phase 10 (and brought-forward into Phase 5)** — Playground UI: remove the standalone "Start headless buy" button. Each row in the quotes list gets its own wide "Start headless buy" action that calls `startHeadlessBuy({ quote })`. Tapping it while a session is active cancels and restarts.
- **Phase 5b (deferred)** — The "raw params → Host fetches quotes → Host picks one → `continueWithQuote`" path is still on the roadmap, just sequenced after we ship the quote-first happy path.

---

## Phase 4b — Headless Host screen + parameterized reset base

Goal: solve the "auth loop" problem before we try to skip BuildQuote.

Today every reset in [app/components/UI/Ramp/hooks/useTransakRouting.ts](../hooks/useTransakRouting.ts) puts `Routes.RAMP.AMOUNT_INPUT` (BuildQuote) at the bottom of the stack, e.g.:

```ts
navigation.reset({
  index: 1,
  routes: [
    { name: Routes.RAMP.AMOUNT_INPUT, params: { amount } },
    { name: routeName, params: routeParams },
  ],
});
```

This is intentional — BuildQuote is the "base camp" of the native flow loop:

```mermaid
flowchart LR
  BQ["BuildQuote (AMOUNT_INPUT)"] -->|continue, not authed| EE["EnterEmail"]
  EE --> OTP["OtpCode"]
  OTP -->|"reset → [BQ, next]"| KYC["BasicInfo / KycWebview / KycProcessing / Webview"]
  KYC --> BQ
  OTP -.->|"navigate(AMOUNT_INPUT, { nativeFlowError })"| BQ
```

[OtpCode.tsx](../Views/NativeFlow/OtpCode.tsx) lines 252–260 also navigates back to `AMOUNT_INPUT` with a `nativeFlowError` param to surface auth errors. So if we just skip BuildQuote, post-login resets land on a missing screen and errors disappear.

Solution — introduce a Headless Host that takes BuildQuote's role in the headless stack:

- New route `Routes.RAMP.HEADLESS_HOST = 'RampHeadlessHost'`. Screen at `app/components/UI/Ramp/Views/HeadlessHost/HeadlessHost.tsx`.
- The Host is a transparent / minimal loader (spinner + cancel button) and never shows ramp UI. **Revised shape (post-direction-change):** the host carries only the session id + the `nativeFlowError` mirror; the quote and any derived context live on the session payload.

```ts
interface HeadlessHostParams {
  headlessSessionId: string;
  nativeFlowError?: string; // mirrors BuildQuote's param so OtpCode's existing surface keeps working
}
```

> Earlier draft (kept for the deferred Phase 5b "Host fetches quotes" path):
>
> ```ts
> interface HeadlessHostParams {
>   headlessSessionId: string;
>   assetId: string;
>   amount: number;
>   paymentMethodId: string;
>   providerId?: string;
>   nativeFlowError?: string;
> }
> ```
>
> When 5b lands the Host can accept either shape (a `quote` on the session, or raw params requiring an in-Host `getQuotes` + auto-pick step).

- On focus, the Host reads `getSession(headlessSessionId)` and dispatches:
  1. **Quote-first session** (Phase 5 revised) — read `session.params.quote` and call `continueWithQuote(quote, deriveCtxFromQuote(quote))` from Phase 4. This naturally handles the loop case — when `OtpCode` resets to `[HEADLESS_HOST, KycWebview]` (Phase 5 wires this), focus on Host briefly fires before the reset settles on the next screen, and on subsequent loop returns Host kicks off the next step.
  2. **Raw-params session** (deferred Phase 5b) — fetch quotes, auto-pick, then `continueWithQuote(...)`.
- If `nativeFlowError` is present, fire `onError('AUTH_FAILED', { message })` via the session registry instead of rendering it.
- Back-press on Host → `endSession` + `onClose({ reason: 'user_dismissed' })`.

Parameterize `useTransakRouting` reset helpers with a `baseRoute`:

- Update `useTransakRouting(config?)` to accept `{ baseRoute?: string; baseRouteParams?: object }` (default `Routes.RAMP.AMOUNT_INPUT`).
- All reset helpers swap the first route in the `routes` array to `baseRoute` with `baseRouteParams`.
- Affected helpers in [useTransakRouting.ts](../hooks/useTransakRouting.ts): `navigateToVerifyIdentityCallback` (164–177), `navigateToBasicInfoCallback` (179–204), `navigateToAdditionalVerificationCallback` (242–269), `navigateToWebviewModalCallback` (358–377), `navigateToKycProcessingCallback` (379–393), `navigateToKycWebviewCallback` (395–429).
- `navigateToBankDetailsCallback` (206–225) and `navigateToOrderProcessingCallback` (227–240) reset to a single screen — no base — so unaffected by this phase but will be touched in Phase 6.
- BuildQuote keeps using `useTransakRouting()` with no config (back-compatible).
- Headless Host calls `useTransakRouting({ baseRoute: Routes.RAMP.HEADLESS_HOST, baseRouteParams: { headlessSessionId } })` (post-direction-change shape — see Host params above).

Also patch the OtpCode error-navigate at [OtpCode.tsx](../Views/NativeFlow/OtpCode.tsx) line 252:

```ts
const baseRoute = headlessSessionId
  ? Routes.RAMP.HEADLESS_HOST
  : Routes.RAMP.AMOUNT_INPUT;
navigation.navigate(baseRoute, {
  nativeFlowError,
  headlessSessionId,
});
```

The `headlessSessionId` is read from current route params (threaded by Phase 5 navigation) or via a small `useHeadlessSession()` helper that reads it from the deepest ramp route's params. With the quote-first design, only `headlessSessionId` and `nativeFlowError` need to be threaded — everything else is looked up off the session.

Tests:

- `useTransakRouting.test.ts`: existing assertions pass; new assertions that with `baseRoute: 'RampHeadlessHost'` the resets land on the host.
- `HeadlessHost.test.tsx`: renders loader; on focus calls `continueWithQuote`; back-press fires `onClose`; `nativeFlowError` param fires `onError`.

No public-API change to `useHeadlessBuy` yet — this is the wiring that makes Phase 5 safe.

---

## Phase 4c — Make `useContinueWithQuote` headless-ready

Goal: let the Host call `continueWithQuote(quote, ctx)` without ever touching the controller-selected state.

Today [useContinueWithQuote.ts:67–98](../hooks/useContinueWithQuote.ts#L67-L98) reads:

- `selectedToken` (for `chainId`, `symbol`)
- `selectedProvider` (for `name`)
- `selectedPaymentMethod` (for `id`, used in the native Transak quote fetch)
- `userRegion?.country?.currency` → `currency`
- `useRampAccountAddress(selectedToken?.chainId)` → `walletAddress`

That's fine for `BuildQuote` (it pre-seeds the controller before continuing), but the Host has none of those — and `Quote` doesn't always carry them in the shape `continueWithQuote` expects.

Extend the context (additive — keep BuildQuote behavior unchanged):

```ts
export interface ContinueWithQuoteContext {
  amount: number;
  assetId: string;
  // Headless overrides — when omitted, the hook keeps reading from controller
  // state / useRampAccountAddress, preserving today's BuildQuote behavior.
  chainId?: CaipChainId;
  walletAddress?: string;
  currency?: string; // fiat currency, e.g. 'USD'
  cryptoSymbol?: string; // selectedToken.symbol fallback
  paymentMethodId?: string; // for native Transak `transakGetBuyQuote`
  providerName?: string; // for Checkout WebView's `providerName`
}
```

Inside the hook, switch every reference of `selectedToken?.chainId` / `selectedPaymentMethod?.id` / etc. to `ctx.* ?? <existing controller fallback>`, including `useRampAccountAddress(ctx.chainId ?? selectedToken?.chainId)`.

Tests:

- BuildQuote integration unchanged (no overrides → same behavior).
- New headless test: invoke `continueWithQuote(nativeQuote, { ...quoteCtx })` with no controller selections set → routes correctly using only the override fields.
- Same for an aggregator quote.

Deliverable: a Host (and any future caller) can drive `continueWithQuote` purely from a `Quote` + a small derived context object.

---

## Phase 5 (revised) — Quote-first headless start

Goal: an external dev who already picked a `Quote` (via their own UI on top of `getQuotes`) can call `startHeadlessBuy({ quote })` and land directly in checkout / login without ever seeing BuildQuote.

> Renamed from the original "Phase 5b — Quote-first headless start path" and **promoted to be the first headless start path we ship**. The earlier "Phase 5 — Headless Host fetches quotes and auto-picks" is preserved below as Phase 5b (deferred).

### Hook changes

- Replace the current `HeadlessBuyParams` (raw `assetId / amount / paymentMethodId / providerId / regionCode`) with the quote-bearing shape:

```ts
export interface HeadlessBuyParams {
  /** A Quote handed in by the consumer — typically from `useHeadlessBuy().getQuotes(...)`. */
  quote: Quote;
  /** Override for the redirect URL injected into provider widgets. */
  redirectUrl?: string;
}
```

- `startHeadlessBuy(params, callbacks)`:
  1. If a previous session exists in the registry (`pending` / `quoting` / `continued`), call `closeSession(prevId, 'consumer_cancelled')` first — guarantees one active session at a time.
  2. `createSession({ quote, redirectUrl }, callbacks)`.
  3. `navigation.navigate(Routes.RAMP.HEADLESS_HOST, { headlessSessionId })`.
  4. Return `{ sessionId, cancel }` exactly like Phase 3.
- Drop the unused params (`assetId / amount / paymentMethodId / providerId / regionCode`) from the public `HeadlessBuyParams`. They're still derivable per-quote (`getChainIdFromAssetId(quote.crypto.assetId)`, `quote.amountIn`, `quote.paymentMethod`) and the Host derives them as needed.

### Host orchestration

- On focus, `HeadlessHost` reads `session = getSession(headlessSessionId)`:
  - If `session` is missing or its status is in `{'completed', 'cancelled'}` → render an inert state (or `goBack`) and bail.
  - If `session.status` is `pending` → `setStatus('continued')` then derive context and call `continueWithQuote(session.params.quote, deriveCtx(session.params.quote))`.
  - If `session.status` is already `continued` → no-op (this is the auth-loop re-focus case where the reset lands on `[HEADLESS_HOST, KycWebview]`; we don't want to double-call).
- `deriveCtx(quote)` builds the Phase 4c override bag from the quote, e.g.:

```ts
function deriveCtx(quote: Quote): ContinueWithQuoteContext {
  return {
    amount: quote.amountIn,
    assetId: quote.crypto.assetId,
    chainId: getChainIdFromAssetId(quote.crypto.assetId) ?? undefined,
    currency: quote.fiat.currency,
    cryptoSymbol: quote.crypto.symbol,
    paymentMethodId: quote.paymentMethod,
    providerName: getQuoteProviderName(quote),
    walletAddress: resolveWalletAddressForChain(...) ?? undefined,
  };
}
```

(Exact field plumbing follows the actual `Quote` shape in [app/components/UI/Ramp/types/index.ts](../types/index.ts) — adjust during implementation.)

### Loop semantics

- Aggregator quote → Host calls `continueWithQuote(quote, ctx)` → widget branch fires `navigation.navigate(Checkout, …)`. Host stays underneath as stack base.
- Native quote, unauthenticated → routed to `EnterEmail` / `VerifyIdentity` (still navigation pushes — Host stays beneath).
- After OTP success, `useTransakRouting` (parameterized in Phase 4b) resets to `[HEADLESS_HOST, KycWebview | …]` — Host's `useFocusEffect` runs but sees `status === 'continued'` and stays idle.
- `OtpCode` error path navigates back to `HEADLESS_HOST` with `nativeFlowError`; Host detects the param and fires `onError('AUTH_FAILED', { message: nativeFlowError })` via the registry instead of rendering it.

### Errors

- Stale / invalid quote (provider rejects) → `continueWithQuote` throws → Host fires `onError('QUOTE_FAILED', { message })` and ends the session.
- No `walletAddress` resolvable for `quote.crypto.assetId` → `onError('UNKNOWN', { message: 'No wallet for chain' })`.
- Wider error mapping (`LIMIT_EXCEEDED`, `KYC_REQUIRED`, …) lands in Phase 7.

### Playground UI changes (brought forward from Phase 10)

- Remove the standalone "Start headless buy" button and its `start_headless_buy_disabled_hint` block from `HeadlessPlayground.tsx` (lines ~1028–1068). Keep the "Cancel headless session" surface — it's now driven by the per-quote actions.
- Inside `QuoteRow` (HeadlessPlayground.tsx ~1259–1377), add a wide bottom-aligned "Start headless buy" `Button` that calls `startHeadlessBuy({ quote })` with the row's quote. Wire the same `onOrderCreated / onError / onClose` callbacks already used by `handleStartHeadlessBuy`.
- Tapping the per-quote button while another session is active should cancel-and-restart automatically — the hook already handles it (see "Hook changes" above). The playground only needs to log it.
- The amount / payment / provider sandbox inputs continue to drive `getQuotes`. They no longer feed `startHeadlessBuy` directly — the consumer's "intent" now flows: amount + filters → quotes → the user picks a quote → `startHeadlessBuy({ quote })`.

### Test plan

- `useHeadlessBuy.test.ts` — `startHeadlessBuy({ quote })` creates a session whose `params.quote === quote`, navigates to `HEADLESS_HOST` with the session id, and starting twice in a row cancels the first session before creating the second.
- `HeadlessHost.test.tsx` —
  - Aggregator quote → `continueWithQuote` called once with the derived ctx, `Checkout` is navigated.
  - Native unauthenticated quote → `EnterEmail` navigated; re-focus does NOT re-call `continueWithQuote`.
  - Native authenticated + KYC approved → Webview navigated.
  - `nativeFlowError` param → `onError('AUTH_FAILED')` fires, no rendering of the error.
- `HeadlessPlayground.test.tsx` — per-quote Start button is rendered for each success entry; tapping it calls `startHeadlessBuy` with the matching quote; the standalone Start button is gone.

Deliverable: an external dev can build a quote-comparison UI on top of `getQuotes`, then call `startHeadlessBuy({ quote })` and skip BuildQuote entirely. The playground demonstrates the same flow row-by-row.

---

## Phase 5b (deferred) — Raw-params start (Host fetches quotes & auto-picks)

> Was the original Phase 5; sequenced after the quote-first path is stable.

Goal: support the second developer story — "I have user intent (amount + filters) but I don't want to do the quote dance myself; just take me to checkout".

When picked up:

- Reintroduce `HeadlessBuyParams` as a discriminated union, e.g.:

```ts
type HeadlessBuyParams =
  | {
      mode: 'continue-with-quote';
      quote: Quote;
      redirectUrl?: string;
    }
  | {
      mode: 'open-build-quote'; // or 'auto-pick-quote'
      assetId: string;
      amount: number;
      paymentMethodId: string;
      providerId?: string;
      regionCode?: string;
    };
```

- For `mode: 'open-build-quote'` the Host accepts the legacy params shape (see "Earlier draft" in Phase 4b), runs `getQuotes(...)`, picks one (default: cheapest, or `providerId`-matched), and calls `continueWithQuote(...)` from there.
- Quote-first behavior from Phase 5 (revised) stays the default branch (`mode: 'continue-with-quote'`).
- Same auth-loop / status-guard semantics carry over.
- Errors specific to this mode: `NO_QUOTES`, `LIMIT_EXCEEDED` — funneled through `onError`.
- Tests cover both branches separately; the registry helper for "starting a new session cancels the old one" is reused unchanged.

---

## Phase 6 — Bypass order-processing redirect & fire callback

Goal: when the flow produces an orderId under a headless session, call the callback and leave screen management to the caller.

- Thread `headlessSessionId` through navigation params for: `Checkout`, `KycWebview`, `EnterEmail`, `BasicInfo`, `VerifyIdentity`, `AdditionalVerification` (see [app/components/UI/Ramp/routes.tsx](../routes.tsx) lines 37–97).
- In [app/components/UI/Ramp/hooks/useTransakRouting.ts](../hooks/useTransakRouting.ts):
  - Modify `navigateToOrderProcessingCallback` (lines 227–240) and `handleNavigationStateChange` (lines 271–356) to check for `headlessSessionId` in route params:
    - If headless → `getSession(id).callbacks.onOrderCreated(orderId)` then `endSession(id)` and `navigation.pop(N)` (or `goBack`) to unwind to the caller.
    - Otherwise → existing behavior (reset to `RAMPS_ORDER_DETAILS`).
- Same treatment for aggregator Checkout WebView success in `app/components/UI/Ramp/Views/Checkout/Checkout.tsx`.
- Tests:
  - Given a session, the callback fires with the correct orderId and no navigation to `RAMPS_ORDER_DETAILS`.
  - Without a session, behavior is unchanged.

---

## Phase 7 — Surface errors/limits as data (extract UI coupling)

Goal: headless consumers should not rely on toasts/banners; they need structured results.

- Audit error/limit surfaces:
  - `checkUserLimits` `LimitExceededError` throw paths in [app/components/UI/Ramp/hooks/useTransakRouting.ts](../hooks/useTransakRouting.ts) lines 99–161.
  - `showV2OrderToast` calls in `useTransakRouting.ts` lines 311–316.
  - Quote error surfacing in `BuildQuote.tsx` (`rampsError` state, lines 168+, `nativeFlowError` effect lines 170–175).
- Introduce a typed `HeadlessBuyError` union (`NO_QUOTES`, `LIMIT_EXCEEDED`, `KYC_REQUIRED`, `AUTH_FAILED`, `QUOTE_FAILED`, `USER_CANCELLED`, `UNKNOWN`).
- In the headless path, route these through `onError` instead of the existing UI surfaces. Keep existing UI surfaces intact for the non-headless path.
- Tests assert that UI side-effects (toasts) are NOT called when `headlessSessionId` is present.

---

## Phase 8 — Cancellation + `onClose`

Goal: close/cancel semantics — make sure every way out of a headless flow ends the session and notifies the consumer exactly once.

Today (post-Phase 3) only the consumer-initiated `cancel()` returned by `startHeadlessBuy` ends a session. If the user backs out of `BuildQuote` (or any subsequent headless screen) the session stays alive in the registry, the consumer never gets `onClose`, and the playground requires a manual "Cancel headless session" tap. Phase 8 closes that gap.

### Triggers that must fire `onClose` automatically

| Trigger                                                                                                                    | Reason               | Where to wire                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User backs out of the headless entry screen (BuildQuote until Phase 4b lands, Headless Host afterwards) before any orderId | `user_dismissed`     | Screen `useEffect` cleanup keyed on `headlessSessionId` — if the screen unmounts and `session.status` is still `pending` / `quoting`, end + onClose.                                                                                         |
| User backs out of an in-flight Checkout / KYC / EnterEmail / OtpCode / Webview                                             | `user_dismissed`     | Same cleanup pattern, but only if the _whole_ headless stack is leaving — detect via `useFocusEffect` + checking the next focused route is outside the ramp stack, or via a `headlessStackUnmount` listener on the Headless Host (Phase 4b). |
| Successful order produced (Phase 6 fires `onOrderCreated`)                                                                 | `completed`          | Right after `onOrderCreated` in Phase 6 paths — end session and fire `onClose({ reason: 'completed' })`. Today Phase 6 only does `endSession`; Phase 8 adds the trailing `onClose`.                                                          |
| Consumer cancellation (`startHeadlessBuy(...).cancel()`)                                                                   | `consumer_cancelled` | Already wired in Phase 3. Keep as-is.                                                                                                                                                                                                        |
| New `startHeadlessBuy(...)` invoked while a previous session is still alive (Phase 5 revised)                              | `consumer_cancelled` | Hook auto-calls `closeSession(prevId, 'consumer_cancelled')` before creating the new session. From the consumer's perspective this fires `onClose({ reason: 'consumer_cancelled' })` exactly once on the previous session.                   |
| Hard error from Phase 7 (`onError(...)` then session is dead)                                                              | `unknown`            | After `onError`, end session and fire `onClose({ reason: 'unknown' })` so consumers always get a terminal close event.                                                                                                                       |

### Implementation plan

- Add a small `useHeadlessSessionDismissal(headlessSessionId)` hook in `app/components/UI/Ramp/headless/`:
  - On mount: marks session as alive (`setStatus('pending')` if not already past).
  - On unmount or blur-with-no-headless-route-on-stack: if `getSession(id)?.status` is not in `{'completed', 'cancelled'}`, call `endSession(id)` and `callbacks.onClose({ reason: 'user_dismissed' })`.
- Wire it from:
  - `BuildQuote` (Phase 8) — handles the "user opens headless, backs out of BuildQuote" case directly.
  - Headless Host (Phase 4b) — handles every subsequent screen, since the Host is the stack base for the headless flow and unmounts only when the user truly leaves.
- Centralize the terminal-state lifecycle in the registry to avoid double-close: add a small helper `closeSession(id, reason)` that does `setStatus(id, 'completed' | 'cancelled')` + `endSession(id)` + `callbacks.onClose({ reason })`, no-op if the session is already gone. All call-sites (Phase 6 success, Phase 7 errors, Phase 8 dismissal, the existing Phase 3 `cancel()`) should funnel through it.
- Idempotency contract: `onClose` fires **at most once per session**, regardless of how many code paths try to close it.

### Test plan (dismissal)

- Render `BuildQuote` with a `headlessSessionId`, unmount it without producing an order → `onClose({ reason: 'user_dismissed' })` fires once and the session is gone from the registry.
- After Phase 4b: same assertion, but for the Headless Host with a child screen on top — backing out the whole stack fires `onClose` once, internal navigation between Host and KycWebview does NOT.
- Phase 6 success path → `onOrderCreated(orderId)` precedes `onClose({ reason: 'completed' })`, both fire exactly once.
- Phase 7 error path → `onError(...)` precedes `onClose({ reason: 'unknown' })`, both fire exactly once.
- `cancel()` after a screen has already auto-dismissed the session is a no-op (no second `onClose`).

Deliverable: closing the buy flow from anywhere on the headless stack notifies the consumer; the playground no longer needs the manual "Cancel headless session" tap (the button stays for explicit consumer-side cancellation but is no longer required for cleanup).

---

## Phase 9 — Expose `getOrder` + polling helpers

Goal: complete the hook surface.

- Add `getOrder(orderId)` using `useRampsOrders.getOrderById` (already available via [app/components/UI/Ramp/hooks/useRampsOrders.ts](../hooks/useRampsOrders.ts)).
- Add `refreshOrder(providerCode, providerOrderId)` passthrough for polling after a callback.
- Document the hook in a JSDoc at top of `useHeadlessBuy.ts` with a full example.
- Extend playground: after `onOrderCreated` fires, show the orderId and a "Refresh order" button using these helpers.

---

## Phase 10 — Playground polish & discoverability

Goal: make the playground actually useful for exploring the API.

- Per-quote "Start headless buy" buttons + standalone-button removal landed early in Phase 5 (revised) — see that section for details. Phase 10 picks up the polish work on top of that surface.
- Pretty-print session events (`onOrderCreated`, `onError`, `onClose`) in a scrolling log panel.
- Persist the last playground input to `AsyncStorage` to speed iteration.
- Add a quick "Try aggregator" vs "Try native" preset pair (preset = a hardcoded `{ amount, paymentMethodId, providerId }` triple that pre-fills the sandbox inputs and triggers `getQuotes`).

---

## Out of scope for now

- Exporting `useHeadlessBuy` outside of Ramp (stays internal; other teams import directly from `app/components/UI/Ramp/headless`).
- Non-React consumers (imperative/global API).
- Sell flow parity — headless Sell is a follow-up.
- Migrating the existing BuildQuote to use the headless primitives (we only extract what's strictly necessary).
