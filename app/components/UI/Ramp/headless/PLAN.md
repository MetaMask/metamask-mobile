# Headless Buy — Incremental Plan

> Introduce a dev-only "Headless Buy" playground under Ramp Settings that consumes a new `useHeadlessBuy` hook, then incrementally evolve the Unified Buy v2 flow so external UIs can drive it end-to-end without the Ramp UI (skip token/amount screens, bypass the order-processing redirect, surface orderIds through callbacks).

## Phases checklist

- [x] **Phase 1** — Scaffold Headless Playground screen + route + entry row in Ramp Settings (gated by `isInternalBuild`)
- [x] **Phase 2** — Implement `useHeadlessBuy` v0 read-only facade (tokens, providers, payment methods, `getQuotes`) and wire playground inputs/quotes list
- [x] **Phase 3** — Add headless session registry + `startHeadlessBuy` API that navigates into existing BuildQuote with `headlessSessionId`
- [x] **Phase 3.1** — Move pre-seed out of `useHeadlessBuy` — keep params on the session only and let the destination resolve them from the catalog
- [x] **Phase 4** — Extract `handleWidgetProviderContinue` / `handleNativeProviderContinue` into `useContinueWithQuote(quote, ctx)` so both BuildQuote and headless callers can reuse it
- [ ] **Phase 4b** — Introduce Headless Host screen as stack base for the headless flow + parameterize `useTransakRouting` reset helpers with `baseRoute`
- [ ] **Phase 5** — Skip BuildQuote in headless mode — Headless Host fetches the quote, picks one, calls `continueWithQuote`, and re-orchestrates after auth loops return to it
- [ ] **Phase 5b** — Quote-first headless start path — `startHeadlessBuy({ quote })` skips quoting entirely and routes straight through `useContinueWithQuote`
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
- The Host is a transparent / minimal loader (spinner + cancel button) and never shows ramp UI. It accepts:

```ts
interface HeadlessHostParams {
  headlessSessionId: string;
  // serialized just enough to re-orchestrate after the loop returns to base
  assetId: string;
  amount: number;
  paymentMethodId: string;
  providerId?: string;
  nativeFlowError?: string; // mirrors BuildQuote's param so OtpCode's existing surface keeps working
}
```

- On focus, the Host re-runs the orchestration: fetch (or reuse) the quote and call `continueWithQuote(...)` from Phase 4. This naturally handles the loop case — when `OtpCode` resets to `[HEADLESS_HOST, KycWebview]` (Phase 5 wires this), focus on Host briefly fires before the reset settles on the next screen, and on subsequent loop returns Host kicks off the next step.
- If `nativeFlowError` is present, fire `onError('AUTH_FAILED', { message })` via the session registry instead of rendering it.
- Back-press on Host → `endSession` + `onClose({ reason: 'user_dismissed' })`.

Parameterize `useTransakRouting` reset helpers with a `baseRoute`:

- Update `useTransakRouting(config?)` to accept `{ baseRoute?: string; baseRouteParams?: object }` (default `Routes.RAMP.AMOUNT_INPUT`).
- All reset helpers swap the first route in the `routes` array to `baseRoute` with `baseRouteParams`.
- Affected helpers in [useTransakRouting.ts](../hooks/useTransakRouting.ts): `navigateToVerifyIdentityCallback` (164–177), `navigateToBasicInfoCallback` (179–204), `navigateToAdditionalVerificationCallback` (242–269), `navigateToWebviewModalCallback` (358–377), `navigateToKycProcessingCallback` (379–393), `navigateToKycWebviewCallback` (395–429).
- `navigateToBankDetailsCallback` (206–225) and `navigateToOrderProcessingCallback` (227–240) reset to a single screen — no base — so unaffected by this phase but will be touched in Phase 6.
- BuildQuote keeps using `useTransakRouting()` with no config (back-compatible).
- Headless Host calls `useTransakRouting({ baseRoute: Routes.RAMP.HEADLESS_HOST, baseRouteParams: { headlessSessionId, ...hostParams } })`.

Also patch the OtpCode error-navigate at [OtpCode.tsx](../Views/NativeFlow/OtpCode.tsx) line 252:

```ts
const baseRoute = headlessSessionId
  ? Routes.RAMP.HEADLESS_HOST
  : Routes.RAMP.AMOUNT_INPUT;
navigation.navigate(baseRoute, {
  nativeFlowError,
  headlessSessionId,
  ...hostParamsIfHeadless,
});
```

The `headlessSessionId` is read from current route params (threaded by Phase 5 navigation) or via a small `useHeadlessSession()` helper that reads it from the deepest ramp route's params.

Tests:

- `useTransakRouting.test.ts`: existing assertions pass; new assertions that with `baseRoute: 'RampHeadlessHost'` the resets land on the host.
- `HeadlessHost.test.tsx`: renders loader; on focus calls `continueWithQuote`; back-press fires `onClose`; `nativeFlowError` param fires `onError`.

No public-API change to `useHeadlessBuy` yet — this is the wiring that makes Phase 5 safe.

---

## Phase 5 — Skip BuildQuote when headless

Goal: when `startHeadlessBuy` is invoked, bypass the amount/token UI and jump straight to provider continuation, using the Host as the base.

- Change `startHeadlessBuy` (from Phase 3) to navigate to `Routes.RAMP.HEADLESS_HOST` (instead of BuildQuote) with `{ headlessSessionId, assetId, amount, paymentMethodId, providerId? }`.
- The Host's first focus runs:
  1. `getQuotes(...)`.
  2. Pick the quote (default: cheapest, or `providerId`-matched).
  3. `continueWithQuote(quote, { amount, assetId })` — aggregator → Checkout WebView; native → routeAfterAuthentication which now resets onto `[HEADLESS_HOST, next]`.
- Loop semantics:
  - Unauthenticated native → `EnterEmail` → `OtpCode` → on success, `routeAfterAuthentication` resets to `[HEADLESS_HOST, KycWebview|...]`. The Host's focus effect re-runs but sees a non-base screen on top and stays idle (no double-call).
  - To prevent re-entry races, the Host tracks `currentSessionStatus` in the session registry (`pending → quoting → continued`), and only re-orchestrates when status is `pending` or after a back-to-base detection.
- Fallbacks / errors: if no quote, fire `onError('NO_QUOTES')` and `endSession`; if limits exceeded → `onError('LIMIT_EXCEEDED', details)` (no toasts) — these are wired more thoroughly in Phase 7.
- Tests:
  - Aggregator quote → navigates to Checkout route with correct session id and Host underneath.
  - Native unauthenticated quote → navigates to EnterEmail with Host as base.
  - Authenticated + KYC approved → navigates to Webview with Host as base.
  - Re-focus on Host while a child screen is in foreground does not re-trigger orchestration.

---

## Phase 5b — Quote-first headless start path

Goal: support the developer story "I already picked the quote, just take me to checkout/login" without going through the Headless Host's quote-fetch step.

By Phase 5b a consumer can already pair `useHeadlessBuy().getQuotes(...)` with their own selection UI — they shouldn't then have to re-derive `assetId` / `paymentMethodId` / `providerId` from the chosen `Quote` only for the Host to fetch quotes again.

- Turn `HeadlessBuyParams` into a discriminated union:

```ts
type HeadlessBuyParams =
  | {
      mode: 'open-build-quote';
      assetId: string;
      amount: number;
      paymentMethodId: string;
      providerId?: string;
      regionCode?: string;
    }
  | {
      mode: 'continue-with-quote';
      quote: Quote; // from useHeadlessBuy().getQuotes(...)
      redirectUrl?: string;
    };
```

- `mode: 'open-build-quote'` keeps the Phase 5 behavior: navigate to Headless Host, fetch quotes, auto-pick, `continueWithQuote(...)`.
- `mode: 'continue-with-quote'` skips the quote-fetch step entirely:
  1. `createSession({ mode: 'continue-with-quote', quote, ... }, callbacks)`.
  2. Navigate to Headless Host.
  3. Host reads `session.params.quote` and immediately calls `continueWithQuote(quote, { amount: quote.amountIn, assetId: quote.crypto.assetId })`.
  4. Native vs widget branch is decided by `isNativeProvider(quote)` (existing helper).
- Because the `Quote` carries provider + payment method context, no controller pre-seeding is needed for either branch — Phase 3.1 already removed that coupling.
- Auth-loop semantics carry over from Phase 5: `OtpCode` reset lands back on the Host with `headlessSessionId`; the Host's status check (`pending → quoting → continued`) prevents double-orchestration when the loop returns to base.
- Errors:
  - Invalid / stale quote (provider rejects) → `onError('QUOTE_FAILED', { details })` and `endSession`.
  - User cancellation mid-flow → existing Phase 8 `onClose({ reason: 'user_dismissed' })` path.
- Tests:
  - Aggregator quote → Host routes straight to Checkout WebView; no `getQuotes` call.
  - Native quote, unauthenticated → Host routes to EnterEmail; on auth success the loop resets back to Host and re-uses the same quote.
  - Native quote, fully authenticated → Host routes to Webview directly.
  - Stale quote → `onError('QUOTE_FAILED')` fires before any navigation.

Deliverable: an external dev can build their own quote-comparison UI on top of `getQuotes`, then call `startHeadlessBuy({ mode: 'continue-with-quote', quote })` and skip the entire build-quote screen.

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
| Hard error from Phase 7 (`onError(...)` then session is dead)                                                              | `unknown`            | After `onError`, end session and fire `onClose({ reason: 'unknown' })` so consumers always get a terminal close event.                                                                                                                       |

### Implementation

- Add a small `useHeadlessSessionDismissal(headlessSessionId)` hook in `app/components/UI/Ramp/headless/`:
  - On mount: marks session as alive (`setStatus('pending')` if not already past).
  - On unmount or blur-with-no-headless-route-on-stack: if `getSession(id)?.status` is not in `{'completed', 'cancelled'}`, call `endSession(id)` and `callbacks.onClose({ reason: 'user_dismissed' })`.
- Wire it from:
  - `BuildQuote` (Phase 8) — handles the "user opens headless, backs out of BuildQuote" case directly.
  - Headless Host (Phase 4b) — handles every subsequent screen, since the Host is the stack base for the headless flow and unmounts only when the user truly leaves.
- Centralize the terminal-state lifecycle in the registry to avoid double-close: add a small helper `closeSession(id, reason)` that does `setStatus(id, 'completed' | 'cancelled')` + `endSession(id)` + `callbacks.onClose({ reason })`, no-op if the session is already gone. All call-sites (Phase 6 success, Phase 7 errors, Phase 8 dismissal, the existing Phase 3 `cancel()`) should funnel through it.
- Idempotency contract: `onClose` fires **at most once per session**, regardless of how many code paths try to close it.

### Tests

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

- Pretty-print session events (`onOrderCreated`, `onError`, `onClose`) in a scrolling log panel.
- Persist the last playground input to `AsyncStorage` to speed iteration.
- Add a quick "Try aggregator" vs "Try native" preset pair.

---

## Out of scope for now

- Exporting `useHeadlessBuy` outside of Ramp (stays internal; other teams import directly from `app/components/UI/Ramp/headless`).
- Non-React consumers (imperative/global API).
- Sell flow parity — headless Sell is a follow-up.
- Migrating the existing BuildQuote to use the headless primitives (we only extract what's strictly necessary).
