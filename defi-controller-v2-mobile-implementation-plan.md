# DeFiPositionsControllerV2 — metamask-mobile Implementation Plan

Port the new `DeFiPositionsControllerV2` work (already done in `metamask-core@defi-controller-v2` and `metamask-extension@defi-positions-v2`) into `metamask-mobile`, behind a feature flag, while keeping mobile's own components and layout.

The three headline mobile-specific goals:

1. Wire the new **on-demand** V2 controller into mobile's Engine (it does **not** poll — the client decides when to fetch).
2. Port the new **flat protocol-group grouping** and V2 UI, adapted to mobile's existing `DeFiSection` / `DeFiFullView` / `DeFiProtocolPositionDetails` components and design-system styling.
3. Change the DeFi section so it is **always mounted (even when empty/hidden)** and triggers the V2 fetch **only when the section scrolls into the viewport** — replacing today's "hidden when empty + fetch on focus" behavior.

---

## 0. Background: what changed in core & extension

### metamask-core (`defi-controller-v2`)

- New `DeFiPositionsControllerV2` in `@metamask/assets-controllers`. Key differences from V1:
  - Extends `BaseController` (V1 extends `StaticIntervalPollingController`). **No polling, no event subscriptions** (`AllowedEvents = never`).
  - Single public method / messenger action: **`fetchDeFiPositions()`**. The client calls it on demand; the controller self-throttles (`minimumFetchIntervalMs`, default 60s) per account set.
  - State key is **`allDeFiPositionsV2`**, keyed by **internal account ID** (UUID), not address. `persist: true`.
  - Data source is the **Accounts API v6 multiaccount balances** endpoint via `@metamask/core-backend`'s `ApiPlatformClient` (`apiClient.accounts.fetchV6MultiAccountBalances`) — not the old DeFi-adapters endpoint. EVM + Solana.
  - Constructor: `{ messenger, apiClient, isEnabled, getVsCurrency, minimumFetchIntervalMs?, state? }`.
  - Depends on messenger action `AccountTreeController:getAccountsFromSelectedAccountGroup`.
  - Feature gating is fully delegated to the client via `isEnabled: () => boolean` (core has no flag code).
- New grouping `groupDeFiPositionsV6` produces a **flat list of protocol-per-chain groups** (`DeFiProtocolPositionGroup[]`) per account, each carrying its own `chainId` and embedded detail `sections` — replacing V1's nested `chain → protocol → positionType` map. No separate fetch needed to render the details page.
- `build-defi-balances-query.ts`: `buildDeFiBalancesQuery(accounts)` → `{ networks, internalAccountIdByCaip }`; `DEFI_SUPPORTED_NETWORKS` hardcoded CAIP-2 list.
- New exports from `@metamask/assets-controllers`: `DeFiPositionsControllerV2`, `getDefaultDeFiPositionsControllerV2State`, `DEFI_POSITION_TYPES`, `DEFI_POSITION_LIABILITY_TYPES`, `DEFI_SUPPORTED_NETWORKS`, `buildDeFiBalancesQuery`, plus types `DeFiPositionsControllerV2State/Actions/Events/Messenger`, `DeFiPositionsByAccount`, `DeFiProtocolPositionGroup`, `DeFiPositionDetailsSection`, `DeFiUnderlyingPosition`, `DeFiPositionIconGroupItem`, `DeFiPositionType`, `DeFiPositionsControllerV2FetchDeFiPositionsAction`.
- Core-backend type change: `V6BalanceMetadata.protocolName` → **`productName`**, plus new `groupId`.

> ⚠️ **Two things to strip / avoid from the raw core branch before/while porting:**
>
> - `fetchDeFiPositions` contains a **temporary hardcoded test address** override (`eip155:0:0x3e87...`). Must not ship. Use a published preview build that predates it, or wait for the cleaned core PR.
> - The extension flag helper ends in `|| true` (dev force-on). Do **not** replicate the `|| true`; mobile must honor the real flag value.

### metamask-extension (`defi-positions-v2`)

- Bumps `@metamask/assets-controllers` to a preview build (`npm:@metamask-previews/assets-controllers@109.4.1-preview-2a8139a3e`).
- Registers the controller via the messenger-client-init pattern with:
  - controller messenger delegating `AccountTreeController:getAccountsFromSelectedAccountGroup`;
  - init messenger delegating `RemoteFeatureFlagController:getState`, `CurrencyRateController:getState`, `AuthenticationController:getBearerToken`.
  - `apiClient` from `createApiPlatformClient` (core-backend) with a `getBearerToken` from `AuthenticationController`.
  - `isEnabled = completedOnboarding && useExternalServices && remoteFlag`.
  - `getVsCurrency = CurrencyRateController.currentCurrency`.
- Flag name: **`defi-controller-v-2`**. Shared helper `isDefiControllerV2Enabled` used by both background `isEnabled` and UI selectors.
- UI: `useDeFiPositionsV2` hook (fetch on account-group change + merge positions across accounts in the group), gated V2 components (`defi-list-v2`, `defi-protocol-cell-v2`, `defi-details-list-v2`, `defi-details-position-cell-v2`, `defi-details-page-v2`), toggled against V1 by the flag at the tab and details-page levels.
- The client-side grouping utils (`group-defi-protocol-positions.ts`, `normalize-v6-balance.ts`) are **dead code** on the branch (grouping moved into core). Do not port them; port the hook's cross-account **merge** logic and `map-defi-protocol-details-position-v2.ts`.

---

## 1. Mobile today (what we're changing)

- **No DeFi tab.** DeFi is a section on the redesigned Homepage: `app/components/Views/Homepage/Sections/DeFi/DeFiSection.tsx`, rendered inside `app/components/Views/Homepage/Homepage.tsx`, which lives in the main wallet screen `app/components/Views/Wallet/index.tsx` inside a `ConditionalScrollView` (plain vertical `ScrollView`, sections `.map()`-rendered — no virtualization). There is also a `HomepageDiscoveryTabs` A/B variant.
- **Hidden-when-empty logic** in `DeFiSection.tsx`:
  ```tsx
  if (!isDeFiEnabled) return null;
  if (!isLoading && isEmpty) return null; // <-- must change
  ```
- **Fetch on focus** (V1) in `DeFiSection.tsx`:
  ```tsx
  useFocusEffect(
    useCallback(() => {
      if (!isDeFiEnabled) return;
      Engine.context.DeFiPositionsController?._executePoll()?.catch(
        () => undefined,
      );
    }, [isDeFiEnabled]),
  ); // <-- replace with viewport-triggered V2 fetch
  ```
- V1 controller already wired: `app/core/Engine/controllers/defi-positions-controller/defi-positions-controller-init.ts` + `app/core/Engine/messengers/defi-positions-controller-messenger/…` — **the reference pattern for adding V2**.
- Selectors: `app/selectors/defiPositionsController.ts` (tri-state `undefined`=loading / `null`=error / object), `app/selectors/featureFlagController/assetsDefiPositions/index.ts`, `app/selectors/deFiPositionsSectionEnabled.ts`.
- Other DeFi UI: `app/components/UI/DeFiPositions/*` (`DeFiPositionsList`, `DeFiPositionsListItem`, `DeFiProtocolPositionDetails`, `DeFiProtocolPositionGroups`, `DeFiAvatarWithBadge`), `DeFiFullView`, `DefiEmptyState`.
- **Viewport primitive already exists**: `app/components/Views/Homepage/hooks/useSectionViewportVisible.ts` returns `{ isVisible, onLayout }` (true when ≥30% of the section intersects the scroll viewport), driven by `HomepageScrollContext` (`subscribeToScroll`, `viewportHeight`, `containerScreenY`). Reference consumer: `app/components/Views/Homepage/Sections/TopTraders/` (`useSectionViewportVisible` + `usePrefetchTraderProfiles` gated on `isSectionVisible`, deferred via `InteractionManager`).

---

## 2. Decisions to confirm before starting

1. **Coexist behind a flag (recommended), mirroring extension.** Keep V1 fully intact; add a new flag that switches `DeFiSection` (and full-view/details) to V2 controller + V2 hook + always-mounted + viewport-trigger behavior. This keeps rollback trivial. Alternative: hard cut-over (simpler code, riskier).
2. **New flag name.** Add a dedicated flag, e.g. `assetsDefiPositionsV2Enabled` in `app/constants/featureFlags.ts` (mobile convention), rather than reusing extension's `defi-controller-v-2` string — confirm the remote-config key with the flags/backend owner.
3. **`@metamask/assets-controllers` version.** Confirm the preview/release build that (a) includes `DeFiPositionsControllerV2` and (b) does **not** contain the hardcoded test address. Extension used `109.4.1-preview-2a8139a3e`.
4. **core-backend availability.** Confirm mobile can depend on `@metamask/core-backend` `createApiPlatformClient` and has an `AuthenticationController` action for the bearer token (extension uses `AuthenticationController:getBearerToken`). If mobile's auth action name differs, adapt.
5. **Viewport-empty gotcha (see §5).** Agree on the placeholder approach that lets the section be measured before the first fetch.

---

## 3. Phase A — Wire the V2 controller into Engine

Mirror the existing V1 init/messenger pattern.

### A1. Dependency bump

- `package.json`: bump `@metamask/assets-controllers` to the agreed build that includes V2. Run the repo's dedupe/patch checks. Confirm `@metamask/core-backend` is present (add if needed) for `createApiPlatformClient`.

### A2. Controller init

Create `app/core/Engine/controllers/defi-positions-controller-v2/defi-positions-controller-v2-init.ts`:

- `MessengerClientInitFunction<DeFiPositionsControllerV2, DeFiPositionsControllerV2Messenger, DeFiPositionsControllerV2InitMessenger>`.
- Lazily create a shared `ApiPlatformClient` via `createApiPlatformClient({ clientProduct: 'metamask-mobile', clientVersion, getBearerToken })` where `getBearerToken` calls the mobile auth action (try/catch → `undefined`).
- Construct:
  ```ts
  new DeFiPositionsControllerV2({
    messenger,
    apiClient,
    isEnabled: () =>
      selectBasicFunctionalityEnabled(store.getState()) &&
      selectCompletedOnboarding(store.getState()) &&
      selectAssetsDefiPositionsV2Enabled(store.getState()),
    getVsCurrency: () =>
      initMessenger.call('CurrencyRateController:getState').currentCurrency,
  });
  ```
  (Match the exact onboarding/basic-functionality selectors mobile already uses in the V1 init.)
- State **not persisted** — return `persistedStateKey: null` (extension does the same; positions are re-fetched).

### A3. Messenger

Create `app/core/Engine/messengers/defi-positions-controller-v2-messenger/defi-positions-controller-v2-messenger.ts` with two factories (mobile convention):

- `getDeFiPositionsControllerV2Messenger` — namespace `DeFiPositionsControllerV2`; delegate allowed **actions**: `['AccountTreeController:getAccountsFromSelectedAccountGroup']`; allowed **events**: none.
- `getDeFiPositionsControllerV2InitMessenger` — delegate `['RemoteFeatureFlagController:getState', 'CurrencyRateController:getState', <auth bearer-token action>]`. Export `DeFiPositionsControllerV2InitMessenger = ReturnType<...>`.

### A4. Register

- `app/core/Engine/Engine.ts`: import `defiPositionsControllerV2Init`; add `DeFiPositionsControllerV2: defiPositionsControllerV2Init,` to the controllers-init map; wire messenger client; include in context + `state`.
- `app/core/Engine/messengers/index.ts`: add
  ```ts
  DeFiPositionsControllerV2: {
    getMessenger: getDeFiPositionsControllerV2Messenger,
    getInitMessenger: getDeFiPositionsControllerV2InitMessenger,
  },
  ```
- `app/core/Engine/types.ts`: import `DeFiPositionsControllerV2` + `…State/Actions/Events`; add to actions union, events union, `Controllers` map, `EngineState`. (Since not persisted, do **not** add to the persisted-controller name union — confirm against how mobile treats non-persisted controllers.)
- `app/core/Engine/constants.ts`: add `'DeFiPositionsControllerV2:stateChange'` to the subscribed state-change allow-list so the UI re-renders on updates.
- Update `app/util/test/initial-background-state.json` (and any engine-state test fixtures / snapshots) to include `DeFiPositionsControllerV2: { allDeFiPositionsV2: {} }`.

### A5. Fetch entry point for the UI

Mobile calls controllers directly, so the UI trigger is:

```ts
await Engine.context.DeFiPositionsControllerV2.fetchDeFiPositions();
```

No `submitRequestToBackground` equivalent needed (that's extension-specific). Optionally add a tiny thunk/util `fetchDeFiPositionsV2()` wrapping the call for testability.

---

## 4. Phase B — Feature flag, selectors, grouping types

### B1. Flag

- `app/constants/featureFlags.ts`: add `assetsDefiPositionsV2Enabled = 'assetsDefiPositionsV2Enabled'` to `FeatureFlagNames` and a default (start `false`) in `DEFAULT_FEATURE_FLAG_VALUES`.
- `app/selectors/featureFlagController/assetsDefiPositionsV2/index.ts`: `selectAssetsDefiPositionsV2Enabled` mirroring `selectAssetsDefiPositionsEnabled` (read `selectRemoteFeatureFlags` + default). **No `|| true`.**
- Optionally a composed gate `selectDeFiPositionsV2SectionEnabled = selectAssetsDefiPositionsV2Enabled && selectBasicFunctionalityEnabled` (mirror `deFiPositionsSectionEnabled.ts`).

### B2. State selectors

- `app/selectors/defiPositionsControllerV2.ts`:
  - `selectDeFiPositionsV2State = (s) => s?.engine?.backgroundState?.DeFiPositionsControllerV2?.allDeFiPositionsV2 ?? {}` (keyed by internal account ID).
  - Reuse core types (`DeFiProtocolPositionGroup`, etc.) directly from `@metamask/assets-controllers` — do not redefine.
  - Provide selectors that take the selected account-group account IDs (see hook) and network filter, returning tri-state consistent with mobile's existing loading/error convention if you keep it, or migrate to the extension's `isLoading`/`isError` booleans in the hook (recommended — see B3).

### B3. Port the merge logic (the only grouping logic to port)

Grouping into protocol-per-chain groups happens in **core**. The only UI-side transform to port from extension is the cross-account merge in `useDeFiPositionsV2` (`mergePositionsForAccounts` / `mergeSections`): merge the selected account-group's multiple accounts into one flat `DeFiProtocolPositionGroup[]`, keyed by `` `${chainId}#${protocolId}` ``, summing `marketValue`, de-duping `iconGroup` by `symbol`, and merging `sections` by `productName`. Put this in a mobile util, e.g. `app/components/UI/DeFiPositions/utils/mergePositionsForAccounts.ts`, with unit tests.

Also port `map-defi-protocol-details-position-v2.ts` (maps a `DeFiUnderlyingPosition` → mobile's token/asset display model) adapted to mobile's token cell props and asset-image helper (mobile has its own `get-token-avatar-url.ts`).

---

## 5. Phase C — The tricky part: always-mounted section + viewport-triggered fetch

**Requirement:** the DeFi section must remain in the layout even when there are no positions (so it can be detected entering the viewport), and the V2 `fetchDeFiPositions` call must fire **only when the section enters the viewport** — not on screen focus.

### The core problem

`useSectionViewportVisible` measures the section via `measureInWindow` and **early-returns when `height === 0`**. Today, when empty, `DeFiSection` returns `null` → no node → nothing to measure → can never detect entry → can never trigger the fetch. Chicken-and-egg. So the section must render a **measurable placeholder with non-zero height before the first fetch**, then collapse only after a fetch confirms it's empty.

### C1. Section render lifecycle (new)

Restructure `DeFiSection.tsx` (V2 path) around a small state machine:

- **Root `View` always rendered** with `ref={sectionRef}` and `onLayout` (combined with the existing `useHomeViewedEvent` onLayout), whenever `isDeFiEnabled` (flag) is true. Never `return null` while enabled and not-yet-resolved-empty.
- States:
  1. `idle` (never fetched): render a **placeholder** with a deterministic non-zero min height (e.g. the section header + a short skeleton row). This is what gets measured to detect viewport entry.
  2. `loading`: skeleton (existing).
  3. `loaded-nonempty`: the V2 list.
  4. `loaded-empty`: collapse — render `null` (or a 0-height `View`). Now it's fine that it can't be measured; the fetch already happened.
  5. `error`: retry UI (existing).
- Keep a `hasTriggeredFetchRef` so the fetch fires once per relevant key (account group + visit), like `usePrefetchTraderProfiles`'s `hasFired` guard.

### C2. Visibility wiring

```tsx
const sectionRef = useRef<View>(null);
// Do NOT pass isLoading while idle, or visibility resets and never triggers the first fetch.
const { isVisible, onLayout: visibilityOnLayout } = useSectionViewportVisible(
  sectionRef,
  { isLoading: false },
);

// combine with existing home-viewed onLayout
const handleLayout = useCallback(() => {
  homeViewedOnLayout();
  visibilityOnLayout();
}, [homeViewedOnLayout, visibilityOnLayout]);
```

- Attach `ref={sectionRef}` + `onLayout={handleLayout}` to the section's root `View`.

### C3. The V2 hook (mobile) — fetch gated on visibility

Create `app/components/Views/Homepage/Sections/DeFi/hooks/useDeFiPositionsV2.ts` (or under `app/components/UI/DeFiPositions/hooks/`). Responsibilities:

- Read `getSelectedAccountGroup` + the group's internal accounts (mobile's account-tree selectors) → `accountIds`.
- Read `selectDeFiPositionsV2State` → merge via `mergePositionsForAccounts(state, accountIds)` (memoized) → `positions`.
- Compute `hasPositions` = any group account ID present in state; `isLoading = isFetching && !hasPositions`; `isError` on rejection.
- **Trigger:** accept `{ enabled, isVisible }`. Fetch when `enabled && isVisible` and (not yet triggered for the current account-group/visit). Defer with `InteractionManager.runAfterInteractions(...)` (mobile idiom). The controller self-throttles (60s), so re-entry is cheap/safe.
  ```ts
  useEffect(() => {
    if (!enabled || !isVisible) return;
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      setIsFetching(true);
      setIsError(false);
      Engine.context.DeFiPositionsControllerV2.fetchDeFiPositions()
        .catch(() => {
          if (!cancelled) setIsError(true);
        })
        .finally(() => {
          if (!cancelled) setIsFetching(false);
        });
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [enabled, isVisible, selectedAccountGroup]);
  ```
- **Re-fetch on account-group change** while visible (dependency above). Optionally also refetch when it re-enters the viewport after the account changed — keep the trigger keyed on `[isVisible, selectedAccountGroup]`, letting the controller throttle dedupe.
- Return `{ positions, isLoading, isError }` (extension-style booleans), which drive the C1 state machine.

### C4. Remove old behavior on the V2 path

- Remove the `useFocusEffect(_executePoll)` V1 trigger (V2 path only).
- Remove `if (!isLoading && isEmpty) return null;` — replace with the state machine: only collapse to `null` in `loaded-empty` (i.e. after a completed fetch returned zero).
- Keep `if (!isDeFiEnabled) return null;` (flag off → no section at all — matches today).

### C5. Both Homepage layouts + discovery-tabs variant

- `DeFiSection` is rendered in two layouts in `Homepage.tsx` (control + separateTrending) — both get the new behavior automatically since it's inside the component.
- **Verify the discovery-tabs variant** (`HomepageDiscoveryTabs`): confirm `HomepageScrollContext` is provided there and `subscribeToScroll`/`containerScreenY`/`viewportHeight` are populated, otherwise `useSectionViewportVisible` won't fire. If that variant uses a different scroll host, add equivalent context wiring or a fallback trigger (e.g. focus-based) there.
- `enabledSections` in `Homepage.tsx` still gates on the flag only (empty-hiding now lives inside the section) — confirm ordering/keys unaffected.

### C6. Edge cases to handle explicitly

- **Placeholder height vs. 30% threshold:** ensure the idle placeholder is tall enough that `useSectionViewportVisible`'s `min(height*0.3, viewportHeight*0.3)` threshold can be satisfied when partly scrolled into view.
- **Account switch after empty-collapse:** if the section collapsed (empty) and the user switches accounts, it must re-expand to a placeholder and re-arm the trigger. Reset `hasTriggeredFetchRef` and the state machine on `selectedAccountGroup` change.
- **Privacy mode / locked wallet:** gate fetch on unlocked (mirror `usePrefetchTraderProfiles`'s `isUnlocked`).
- **Fast scroll-past:** `subscribeToScroll` is throttled to 100ms; a very fast flick could skip a tick, but `onLayout` + the mount check cover initial visibility. Acceptable.
- **Refresh / pull-to-refresh:** keep the section's `SectionRefreshHandle.refresh()` working — have it call `fetchDeFiPositions()` (bypassing the visibility gate) so pull-to-refresh still updates V2.

---

## 6. Phase D — V2 UI components (mobile, keep mobile layout)

Gate on the flag; when V2 is on, render V2 variants, else keep V1. Reuse mobile design-system components and existing cell layouts; only the **data source and grouping shape** change (flat `DeFiProtocolPositionGroup[]` with embedded `sections`).

- **Section list (homepage, top 5):** V2 variant of `useDeFiPositionsForHomepage` reading merged V2 positions; sort by `marketValue` desc; slice to `MAX_POSITIONS_DISPLAYED` (5). Reuse `DeFiPositionsListItem` layout, mapping from `DeFiProtocolPositionGroup` (protocol icon = `protocolIconUrl`, network badge from `chainId`, title = protocol, right = `marketValue` via mobile currency formatting + `SensitiveText`, footer icons from `iconGroup`).
- **Full view (`DeFiFullView` / `DeFiPositionsList`):** V2 variant reading merged V2 positions, filtered by enabled networks (compare on **CAIP** `chainId`). Reuse control bar / sort.
- **Details (`DeFiProtocolPositionDetails` / `DeFiProtocolPositionGroups`):** V2 reads the group's embedded `sections` (`DeFiPositionDetailsSection[]` → `productName` header + `DeFiUnderlyingPosition[]`), no separate fetch. Map underlying positions with the ported `map-defi-protocol-details-position-v2` → mobile token cell. Navigation params must carry **both `chainId` and `protocolId`** (CAIP chain IDs contain `:`), mirroring extension's `buildDefiRoutePath`/`decodeDefiRouteParam` — encode/decode accordingly for the mobile route params.
- **Chain/network image resolution:** ensure mobile's badge image lookup handles **CAIP** chain IDs (extension added a CAIP→hex fallback in `getImageForChainId`). Add the equivalent in mobile's chain-image util if it only handles hex today.
- Keep `DefiEmptyState` for the full-view empty case (the homepage section instead collapses per §5).

---

## 7. Phase E — Tests

Co-located jest tests (mobile convention). Cover:

- **Controller init/messenger:** `defi-positions-controller-v2-init.test.ts` — messenger delegations, `isEnabled` truth table (basic-functionality × onboarding × flag), `getVsCurrency`, apiClient construction.
- **Selectors:** flag selector default/remote, `selectDeFiPositionsV2State` keyed by account ID, empty default.
- **Merge util:** `mergePositionsForAccounts` — multi-account merge, `marketValue` summing (lending already subtracted upstream), `iconGroup` de-dupe, `sections` merge by `productName`.
- **Details mapper:** `map-defi-protocol-details-position-v2` — native vs slip44, CAIP→hex chainId, balance parsing.
- **`useDeFiPositionsV2` hook:** fetch fires only when `enabled && isVisible`; not on focus; once per account group (throttle-safe); loading/error transitions; account-switch re-arm.
- **`DeFiSection` (V2):** always mounted while flag on; placeholder rendered when idle (measurable); collapses to null only after a completed empty fetch; fetch triggered on `isVisible` true (mock `useSectionViewportVisible`); no fetch when off-screen; V1 path unchanged when flag off.
- **Viewport integration:** a test that flips `useSectionViewportVisible` → visible and asserts `Engine.context.DeFiPositionsControllerV2.fetchDeFiPositions` called exactly once; off-screen → not called.
- Update engine-state fixtures/snapshots (`initial-background-state.json`) and any WalletView test IDs.

---

## 8. Phase F — Verification & rollout

- Manual QA matrix: flag off (V1 unchanged) vs on (V2). Accounts with positions / no positions / mixed EVM+Solana. Scroll DeFi into view from top and from far down. Account switch while section empty. Pull-to-refresh. Privacy mode. Locked → unlock. Both Homepage A/B layouts + discovery-tabs variant.
- Instrument/log the fetch trigger during dev to confirm it fires **only on viewport entry** and is **throttled** (≤1 network call/60s per account set).
- Confirm no double-fetch between V1 focus-poll and V2 viewport-trigger (they must be mutually exclusive by flag).
- Ship behind the remote flag defaulted **off**; enable gradually.

---

## 9. File-change checklist

**New**

- `app/core/Engine/controllers/defi-positions-controller-v2/defi-positions-controller-v2-init.ts` (+ test)
- `app/core/Engine/messengers/defi-positions-controller-v2-messenger/defi-positions-controller-v2-messenger.ts` (+ test)
- `app/selectors/featureFlagController/assetsDefiPositionsV2/index.ts` (+ test)
- `app/selectors/defiPositionsControllerV2.ts` (+ test)
- `app/components/UI/DeFiPositions/utils/mergePositionsForAccounts.ts` (+ test)
- `app/components/UI/DeFiPositions/utils/map-defi-protocol-details-position-v2.ts` (+ test)
- `app/components/Views/Homepage/Sections/DeFi/hooks/useDeFiPositionsV2.ts` (+ test)
- V2 variants of homepage-list / full-view / details data hooks as needed

**Modified**

- `package.json` (assets-controllers bump; core-backend if needed)
- `app/core/Engine/Engine.ts`, `app/core/Engine/messengers/index.ts`, `app/core/Engine/types.ts`, `app/core/Engine/constants.ts`
- `app/constants/featureFlags.ts`
- `app/components/Views/Homepage/Sections/DeFi/DeFiSection.tsx` (state machine, always-mounted, viewport trigger, remove focus-poll on V2 path)
- `app/components/Views/Homepage/Homepage.tsx` (verify section gating/order; discovery-tabs context)
- `app/components/UI/DeFiPositions/*` and `DeFiFullView/*` (V2-gated rendering, CAIP chainId handling, route params carrying chainId+protocolId)
- Mobile chain-image util (CAIP→hex fallback) if needed
- `app/util/test/initial-background-state.json` + affected snapshots/fixtures

---

## 10. Key risks / watch-outs

1. **Viewport-empty chicken-and-egg** (§5) — the placeholder must be measurable before the first fetch; only collapse after a confirmed-empty fetch. This is the crux of the task.
2. **Temporary hardcoded test address** in the core `fetchDeFiPositions` — must not be in the shipped build.
3. **`|| true` dev override** in extension's flag helper — do not replicate.
4. **State keyed by internal account ID (UUID), not address** — all reads must go through the account-group → accountIds path.
5. **core-backend / AuthenticationController availability** on mobile — verify the `getBearerToken` action name and `createApiPlatformClient` support before committing to the wiring.
6. **CAIP chain IDs** everywhere in V2 (network filters, badges, route params) vs mobile's hex-centric code — audit each boundary.
7. **Discovery-tabs A/B variant** may not provide `HomepageScrollContext` — verify or add a fallback trigger.
8. **Double-fetch** between V1 focus-poll and V2 viewport-trigger — keep strictly flag-exclusive.
