# Token Watchlist — Technical Specification (Validated v2)

> **What this is:** The original `WatchList_Technical_Spec_1.md` with every assumption cross-checked against the actual `metamask-mobile` repo as of this branch.
> Every file path below has been verified to exist. Snippets are copy-pasted from source — use them as drop-in references.
> Changes vs. v1 are marked **[CORRECTED]** (assumption was wrong), **[CONFIRMED]** (matches reality), or **[NEW]** (not in v1 but material for engineers).
>
> **Repo root for all paths below:** `/Users/prithpalsooriya/Desktop/projects/metamask-mobile` (referenced simply as `app/…` from here on).

---

## 0. TL;DR of validation findings

| v1 assumption                                                                      | Reality in repo                                                                                                                                                                                                                                                                                                                                                                                                                                            | Action                                                                                                                              |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `app/components/UI/AssetOverview/` is where Token Details lives                    | **[CORRECTED]** It's `app/components/UI/TokenDetails/`. The old `AssetOverview` / `Views/AssetDetails` is legacy.                                                                                                                                                                                                                                                                                                                                          | Use `app/components/UI/TokenDetails/` for the ⭐ icon integration.                                                                  |
| Home page is `app/components/Views/Wallet/`                                        | **[PARTIALLY CORRECT]** The Wallet tab mounts a `Homepage` component (`app/components/Views/Homepage/Homepage.tsx`) behind the `isHomepageSectionsV1Enabled` flag. New section goes in `Homepage.tsx` + `Sections/Watchlist/`.                                                                                                                                                                                                                             | See §3.2.                                                                                                                           |
| `SectionHeader` lives in `components-temp`                                         | **[CONFIRMED]** `app/component-library/components-temp/SectionHeader/` — fully typed, reused by Tokens/Perps/etc.                                                                                                                                                                                                                                                                                                                                          | Use directly.                                                                                                                       |
| `TrendingTokenListItem` is the row to reuse                                        | **[CORRECTED NAME]** The real component is `TrendingTokenRowItem` at `app/components/UI/Trending/components/TrendingTokenRowItem/`.                                                                                                                                                                                                                                                                                                                        | Use directly.                                                                                                                       |
| Swaps "Select Token" has tabs                                                      | **[CORRECTED]** The modern flow is **Bridge** (`BridgeTokenSelector`) and it is **not tabbed** — it's a single `FlatList` with a search bar + `NetworkPills` + network-filter bottom sheet. There is no tab bar.                                                                                                                                                                                                                                           | See §3.5 — this is a bigger UX design decision than v1 implied. Coordinate with Bridge team (not Swaps team — Swaps/Bridge merged). |
| `UserStorageController` exposes `performGetStorage` / `performSetStorage`          | **[CONFIRMED]** Exact method names: `performGetStorage(path, entropySourceId?) → Promise<string \| null>` and `performSetStorage(path, value, entropySourceId?) → Promise<void>`. Values are JSON strings.                                                                                                                                                                                                                                                 | See §2.2.                                                                                                                           |
| New storage key must be registered upstream in `@metamask/profile-sync-controller` | **[CORRECTED]** Schema enforcement is **deprecated** upstream (v28.0.2). Types are now `UserStorageGenericFeatureName` = `string`. No upstream PR needed for TypeScript typing — BUT still coordinate with profile-sync team if the backend has any feature-name allow-list on its side.                                                                                                                                                                   | Drop TASK-0.2's upstream-PR risk; confirm only via a Slack ping.                                                                    |
| Zod for schema validation                                                          | **[CORRECTED]** Zod is not in `package.json`. Use `@metamask/superstruct` (already a dep at `^3.2.1`). See §1-hooks validation snippet.                                                                                                                                                                                                                                                                                                                    | Use Superstruct.                                                                                                                    |
| `useMetrics` / `MetricsEventBuilder` for analytics                                 | **[CORRECTED]** `useMetrics` is now the legacy path. The current convention is **`useAnalytics` → `AnalyticsEventBuilder.createEventBuilder`**, though event names still live in `app/core/Analytics/MetaMetrics.events.ts`.                                                                                                                                                                                                                               | Use `useAnalytics`.                                                                                                                 |
| TanStack Query already in app, QueryClient wired                                   | **[CONFIRMED]** `@tanstack/react-query ^4.43.0`; global client at `app/core/ReactQueryService/ReactQueryService.ts`, provider at `app/components/Views/Root/index.tsx`.                                                                                                                                                                                                                                                                                    | Use existing singleton.                                                                                                             |
| `UserStorageController` is always in `Engine.context`                              | **[CONFIRMED with context]** It's wrapped in `///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)` in `Engine.ts`. Snaps have already shipped to production, so this is effectively always-on for users. **Product decision:** do **not** add new `ONLY_INCLUDE_IF` fences for watchlist code. Defensively handle `Engine.context.UserStorageController === undefined` inside the React Query hooks and treat it as a silent no-op / empty list. | See §2.2 error-handling snippet.                                                                                                    |

---

## 1. Feature Summary

Unchanged from v1. One clarification that matters for Jira:

- **"EVM tokens only in V1"** (v1 §3.3) is still the right scope, but note that `TrendingTokenRowItem` and the Explore infra are **already multi-chain aware** (they emit CAIP-19 asset IDs and route through `formatAddressToAssetId` from `@metamask/bridge-controller` — see §3.1 snippet). The V1 limitation is a product call, not a technical limitation of the row component.

---

## 2. Architecture

### 2.0 High-level layers

The mermaid diagram in v1 is accurate **except** for two boxes:

- `Controller state` should name the controllers that exist today (not generic `AccountTrackerController`): on EVM home / balances, the relevant selectors today live under `app/selectors/assets/` (e.g. `selectSortedAssetsBySelectedAccountGroupForChainIdsByBalance` — used by `TokensSection.tsx`).
- `React hooks` layer is a mix: TanStack Query where server-state is involved, `useSelector` where controller state is read. Both are expected in `useTokenWatchlistQuery`.

### 2.1 Storage **[CONFIRMED with corrections]**

- **Mechanism:** `@metamask/profile-sync-controller@^28.0.2`, `UserStorageController` (the E2E one — correct choice).
- **Mobile init file (this is where the controller is constructed — you do not touch it, but refer to it):**

```1:32:app/core/Engine/controllers/identity/user-storage-controller-init.ts
import { scrypt } from 'react-native-fast-crypto';
import { MessengerClientInitFunction } from '../../types';
import {
  Controller as UserStorageController,
  UserStorageControllerMessenger,
} from '@metamask/profile-sync-controller/user-storage';
import type { UserStorageControllerInitMessenger } from '../../messengers/identity/user-storage-controller-messenger';
import { MetaMetricsEvents } from '../../../Analytics';
import { trace } from '../../../../util/trace';
import { buildAndTrackEvent } from '../../utils/analytics';

// ...

export const userStorageControllerInit: MessengerClientInitFunction<
  UserStorageController,
  UserStorageControllerMessenger,
  UserStorageControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState }) => {
  const controller = new UserStorageController({
    messenger: controllerMessenger,
    // @ts-expect-error: `UserStorageController` does not accept partial state.
    state: persistedState.UserStorageController,
    nativeScryptCrypto: scrypt,
    // @ts-expect-error: Type of `TraceRequest` is different.
    trace,
```

- **Registered in `Engine.context` under key `UserStorageController`** in `app/core/Engine/Engine.ts` (lines ~350 and ~495–580). The registration sits inside `///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)` — Snaps are already GA in production, so this is effectively always-on. **Do not add new code fences in the watchlist code.** Instead, treat `Engine.context.UserStorageController` as potentially-undefined in the React Query hooks (during boot, in unusual build flavors, or in tests) and degrade gracefully to an empty watchlist. See §2.2 for the exact handling.
- **Shape is unchanged** from v1 (single blob, flat `assets: string[]`, `version: 1`).

### 2.2 Client integration point — **EXACT API** [CONFIRMED]

The controller exposes (from `node_modules/@metamask/profile-sync-controller/dist/controllers/user-storage/UserStorageController.d.mts`):

- `performGetStorage(path: string, entropySourceId?: string) => Promise<string | null>` — returns a **JSON string** or `null` if absent.
- `performSetStorage(path: string, value: string, entropySourceId?: string) => Promise<void>` — value is a **JSON string** (stringify yourself).
- `performGetStorageAllFeatureEntries(path, …)` — for feature-only paths (not our shape).
- `performBatchSetStorage(path, values, …)` — for `[[key, value], …]` entries.
- `performDeleteStorage` / `performDeleteStorageAllFeatureEntries` / `performBatchDeleteStorage`.

**Method names differ from v1's guess only in parameter style (JSON-string-typed, not typed-object).**

**Decision: do not pass `entropySourceId`.** The watchlist is **not scoped per seed (SRP)** in V1 — we rely on the controller's default scoping. This keeps the React Query key simple (`['tokenWatchlist', 'blob']`) and removes the need for Identity-team coordination. If multi-SRP scoping is wanted later, it's additive (add the arg + include it in the query key).

Conceptual usage (see §1-hooks for full hook code):

```ts
const raw = await Engine.context.UserStorageController.performGetStorage(
  'tokenWatchlist.main',
);
const blob = raw ? JSON.parse(raw) : { assets: [], version: 1 };
// ...mutate...
await Engine.context.UserStorageController.performSetStorage(
  'tokenWatchlist.main',
  JSON.stringify(blob),
);
```

**Error handling inside the hooks.** Because we intentionally **don't gate our code with `ONLY_INCLUDE_IF`** and we **don't wait on any controller-gate**, the hook must defensively handle:

- `Engine.context.UserStorageController` being `undefined` (build flavor or pre-boot).
- `performGetStorage` throwing (network error, not authenticated yet, vault locked).
- Blob present but malformed JSON or fails Superstruct validation.

In all three cases, the query resolves to an **empty watchlist** (`{ assets: [], version: 1 }`) and the mutation surfaces a rejected promise to the caller so the UI can show a toast. Concretely:

```ts
// app/components/UI/TokenWatchlist/hooks/watchlistStorage.ts
import Engine from '../../../../core/Engine';
import { create } from '@metamask/superstruct';
import { WatchlistBlobSchema, WatchlistBlob } from '../schemas/watchlistBlob';
import Logger from '../../../../util/Logger';

export const WATCHLIST_STORAGE_PATH = 'tokenWatchlist.main';
export const EMPTY_BLOB: WatchlistBlob = { assets: [], version: 1 };

const getController = () => {
  const controller = Engine.context.UserStorageController;
  if (!controller) {
    // Controller may be absent in certain build flavors or pre-boot. Treat as
    // empty watchlist — do NOT throw; a throw would spam Sentry on every read.
    return null;
  }
  return controller;
};

export async function readWatchlistBlob(): Promise<WatchlistBlob> {
  const controller = getController();
  if (!controller) return EMPTY_BLOB;
  try {
    const raw = await controller.performGetStorage(WATCHLIST_STORAGE_PATH);
    if (!raw) return EMPTY_BLOB;
    return create(JSON.parse(raw), WatchlistBlobSchema);
  } catch (error) {
    Logger.error(error as Error, 'TokenWatchlist: failed to read blob');
    return EMPTY_BLOB;
  }
}

export async function writeWatchlistBlob(blob: WatchlistBlob): Promise<void> {
  const controller = getController();
  if (!controller) {
    throw new Error('UserStorageController unavailable');
  }
  // Let this throw — the mutation's onError path will roll back the optimistic update.
  await controller.performSetStorage(
    WATCHLIST_STORAGE_PATH,
    JSON.stringify(blob),
  );
}
```

Write-path errors surface to the caller (so the optimistic star un-flips + a toast like "Couldn't save to watchlist, try again" appears). Read-path errors swallow to `EMPTY_BLOB` — we never want a boot-time auth hiccup to break the whole UI.

**Path format:** `<feature>.<key>`. `feature` is a free-form string (schema enforcement deprecated in v28.x). Pick a **new feature name** like `tokenWatchlist` to avoid collisions with `notifications`, `accounts`, `addressBook`, and `accountTree/*` (already in use). The `key` segment is unused in the single-blob design but required by the path parser — use `main`.

> **There is currently no existing TanStack-Query-wrapping pattern in the app for raw `performGetStorage` / `performSetStorage`.** Closest analogs: `app/actions/identity/index.ts` (imperative actions, no caching) and `app/components/Views/SocialLeaderboard/NotificationPreferencesView/hooks/useNotificationPreferences.ts` (uses a different storage service — `AuthenticatedUserStorageService` — not our controller). **So Phase 1 sets the architectural precedent for this repo.**

### 2.3 State layer — TanStack Query [CONFIRMED]

- Package: `@tanstack/react-query ^4.43.0` (`package.json` line 376).
- Global client singleton: `app/core/ReactQueryService/ReactQueryService.ts` — exported as default and re-exported from `app/core/ReactQueryService/index.ts`.
- Provider wiring (already in place):

```23:98:app/components/Views/Root/index.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import reactQueryService from '../../../core/ReactQueryService';
// ...
<QueryClientProvider client={reactQueryService.queryClient}>
  <FeatureFlagOverrideProvider>
    <ThemeProvider>
      <NavigationProvider>
        <ControllersGate>
          <ToastContextWrapper>
            <HardwareWalletProvider>
              {/* ... */}
              <App />
            </HardwareWalletProvider>
          </ToastContextWrapper>
        </ControllersGate>
      </NavigationProvider>
    </ThemeProvider>
  </FeatureFlagOverrideProvider>
</QueryClientProvider>
```

**Nothing to do** — just consume the default export from `@tanstack/react-query` inside the new hooks.

**Where new hooks should live:** follow the feature-scoped pattern already in the repo. Create `app/components/UI/TokenWatchlist/hooks/` (mirrors `app/components/UI/Ramp/hooks/`, `app/components/UI/Card/hooks/`, `app/components/UI/Predict/hooks/`, etc.). **[CORRECTION to v1]** — do **not** use `app/components/hooks/TokenWatchlist/`; that dir is for truly cross-cutting hooks like `useAnalytics`, `useMetrics`, `useAccounts`.

Query key convention is fine as proposed (`['tokenWatchlist']`). One suggestion: export the keys as a const so tests and invalidation call sites stay in sync:

```ts
export const tokenWatchlistQueryKeys = {
  all: ['tokenWatchlist'] as const,
  blob: ['tokenWatchlist', 'blob'] as const,
  suggested: ['tokenWatchlist', 'suggested'] as const,
};
```

### 2.4 Hydration [CONFIRMED]

Two modes, matching v1:

- **Explore-style** — reuse the Trending Tokens infra. The actual hook used today to fetch trending data is `useTrendingRequest` (imported by `TokensSection.tsx` line 48): `app/components/UI/Trending/hooks/useTrendingRequest/useTrendingRequest.ts`. Inspect it as a reference for the Token API client. Read its call signature before writing the watchlist hydration call.
- **Balance-style** — the canonical mobile entry points today (used by `TokensSection.tsx` and `TokenListItem.tsx`) are:
  - `selectSortedAssetsBySelectedAccountGroupForChainIdsByBalance` (`app/selectors/assets/assets-list.ts`) — returns already-sorted token keys with balances.
  - The `TokenListItem` component itself (`app/components/UI/Tokens/TokenList/TokenListItem/TokenListItem.tsx`) consumes a `tokenKey` and resolves balance internally — you may be able to simply pass through `tokenKey` objects for the Bridge/Swaps surface.

**V1 pushback on charts remains valid.** No batch historical-price endpoint was found in the repo; `TrendingTokenRowItem` does not render a chart either.

### 2.5 Add-item flow

Diagram in v1 is accurate. One implementation note: **`performSetStorage` is fire-and-forget from the server's perspective** — there is no server-side validation of the blob shape. Client-side Superstruct validation (see §1-hooks) is the only safety net.

---

## 3. UI Surfaces — validated file map

Every file below was verified to exist in this branch.

### 3.1 Token Details — ⭐ icon [CORRECTED paths]

**Screen component (this is the one the ⭐ lives on):**

```326:332:app/components/UI/TokenDetails/Views/TokenDetails.tsx
/**
 * TokenDetailsRouteWrapper screen
 * Reads token from React Navigation route.params and renders TokenDetails.
 */
export const TokenDetailsRouteWrapper: React.FC = () => {
  const route = useRoute();
  const token = route.params as TokenDetailsRouteParams;
```

**Navigation registration (screen name is `'Asset'`):**

```194:209:app/components/Nav/Main/MainNavigator.js
const AssetStackFlow = (props) => (
  <Stack.Navigator
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen
      name={'Asset'}
      component={TokenDetails}
      initialParams={props.route.params}
    />
    <Stack.Screen
      name={'AssetDetails'}
      component={AssetDetails}
      initialParams={{ address: props.route.params?.address }}
    />
```

**Canonical asset-id computation already present on this screen** (cmd-click target for "how we get the CAIP-19 id"):

```140:151:app/components/UI/TokenDetails/Views/TokenDetails.tsx
const caip19AssetId = useMemo((): CaipAssetType | null => {
  try {
    if (isCaipAssetType(token.address)) {
      return token.address as CaipAssetType;
    }
    if (!token.chainId) return null;
    return (formatAddressToAssetId(token.address, token.chainId) ??
      null) as CaipAssetType | null;
  } catch {
    return null;
  }
}, [token.address, token.chainId]);
```

> **✅ Good news:** `caip19AssetId` is the exact value we need to pass to the add/remove mutations. No conversion utility needs to be written.

**Where to add the ⭐ icon:**

Two viable placements — both valid, coordinate with design:

1. **Top inline header** — `app/components/UI/TokenDetails/components/TokenDetailsInlineHeader.tsx`. It already has a `rightPlaceholder` sized at 24px, trivially swappable for a star `ButtonIcon`:

```47:67:app/components/UI/TokenDetails/components/TokenDetailsInlineHeader.tsx
export const TokenDetailsInlineHeader = ({
  onBackPress,
}: {
  onBackPress: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const { styles } = useStyles(inlineHeaderStyles, { insets });
  return (
    <View style={styles.container}>
      <View style={styles.backButtonHitArea}>
        <ButtonIcon
          onPress={onBackPress}
          size={ButtonIconSize.Md}
          iconName={IconName.ArrowLeft}
          testID="back-arrow-button"
        />
      </View>
      <View style={styles.rightPlaceholder} />
    </View>
  );
};
```

2. **Action row under the price chart** — `app/components/UI/TokenDetails/components/TokenDetailsActions.tsx`, which renders the horizontal `MainActionButton` row (Buy / Send / Receive / …). Figma likely shows one, not both.

**Reference diff (inline header):**

```tsx
// app/components/UI/TokenDetails/components/TokenDetailsInlineHeader.tsx
import { useTokenWatchlist } from '../../TokenWatchlist/hooks/useTokenWatchlist';
import type { CaipAssetType } from '@metamask/utils';

export const TokenDetailsInlineHeader = ({
  onBackPress,
  assetId,
}: {
  onBackPress: () => void;
  assetId: CaipAssetType | null;
}) => {
  const insets = useSafeAreaInsets();
  const { styles } = useStyles(inlineHeaderStyles, { insets });
  const { isWatched, toggle } = useTokenWatchlist(assetId);

  return (
    <View style={styles.container}>
      <View style={styles.backButtonHitArea}>
        <ButtonIcon
          onPress={onBackPress}
          size={ButtonIconSize.Md}
          iconName={IconName.ArrowLeft}
          testID="back-arrow-button"
        />
      </View>
      {assetId ? (
        <ButtonIcon
          onPress={toggle}
          size={ButtonIconSize.Md}
          iconName={isWatched ? IconName.StarFilled : IconName.Star}
          testID="token-details-watchlist-toggle"
        />
      ) : (
        <View style={styles.rightPlaceholder} />
      )}
    </View>
  );
};
```

**[NEW] AB-test pattern already in this folder:** `app/components/UI/TokenDetails/components/abTestConfig.ts` shows the `ABTestAnalyticsMapping` convention used for the sticky-footer swap label experiment. If Amarildo wants the ⭐ as a phased rollout beyond LaunchDarkly, this is the pattern to follow (see `app/hooks/useABTest.ts`).

### 3.2 Home page — Watchlist section (top 3) [CORRECTED paths]

**v1 says "homepage section composition" — here's the exact file.**

The Wallet tab renders either the legacy `WalletTokensTabView` or the new modular `Homepage` based on the `isHomepageSectionsV1Enabled` flag:

```1320:1354:app/components/Views/Wallet/index.tsx
<AssetDetailsActions
  displayBuyButton={displayBuyButton}
  displaySwapsButton={displaySwapsButton}
  goToSwaps={goToSwaps}
  onReceive={onReceive}
  onSend={onSend}
  buyButtonActionID={WalletViewSelectorsIDs.WALLET_BUY_BUTTON}
  swapButtonActionID={WalletViewSelectorsIDs.WALLET_SWAP_BUTTON}
  sendButtonActionID={WalletViewSelectorsIDs.WALLET_SEND_BUTTON}
  receiveButtonActionID={WalletViewSelectorsIDs.WALLET_RECEIVE_BUTTON}
/>

{isCarouselBannersEnabled && <Carousel style={styles.carousel} />}

{isHomepageSectionsV1Enabled ? (
  <>
    {isFocused && <AssetPollingProvider chainIds={evmChainIds} />}
    <HomepageScrollContext.Provider value={homepageScrollContextValue}>
      <Homepage ref={homepageRef} />
    </HomepageScrollContext.Provider>
  </>
) : (
  <>
    {isFocused && <AssetPollingProvider />}
    <WalletTokensTabView ref={walletTokensTabViewRef} … />
  </>
)}
```

**Register the section in `Homepage.tsx`.** The current section ordering lives in the `enabledSections` memo:

```108:176:app/components/Views/Homepage/Homepage.tsx
const enabledSections = useMemo(() => {
  if (separateTrending) {
    // Treatment: position sections + trending sections + conditional NFT placement
    const sections: { name: HomeSectionName; enabled: boolean }[] = [
      { name: HomeSectionNames.CASH, enabled: isCashSectionEnabled },
      { name: HomeSectionNames.TOKENS, enabled: true },
      // ... watchlist goes here ...
      { name: HomeSectionNames.PERPS, enabled: isPerpsEnabled },
      { name: HomeSectionNames.PREDICT, enabled: isPredictEnabled },
      { name: HomeSectionNames.DEFI, enabled: isDeFiEnabled },
    ];
    // ...
  }
  // Control: original layout
  return [
    { name: HomeSectionNames.CASH, enabled: isCashSectionEnabled },
    { name: HomeSectionNames.TOKENS, enabled: true },
    // ... watchlist goes here ...
    { name: HomeSectionNames.PERPS, enabled: isPerpsEnabled },
    // ...
  ].filter((s) => s.enabled);
}, [/* deps */]);
```

Add a new entry in `HomeSectionNames` (authoritative enum is at `app/components/Views/Homepage/hooks/useHomeViewedEvent.ts` lines 7–22):

```7:22:app/components/Views/Homepage/hooks/useHomeViewedEvent.ts
export const HomeSectionNames = {
  CASH: 'cash',
  TOKENS: 'tokens',
  WHATS_HAPPENING: 'whats_happening',
  PERPS: 'perps',
  DEFI: 'defi',
  PREDICT: 'predict',
  NFTS: 'nfts',
  TOP_TRADERS: 'top_traders',
  TRENDING_TOKENS: 'trending_tokens',
  TRENDING_PERPS: 'trending_perps',
  TRENDING_PREDICT: 'trending_predict',
} as const;
```

**→ Add** `WATCHLIST: 'watchlist'`.

**Best sibling template:** `app/components/Views/Homepage/Sections/Tokens/TokensSection.tsx` — it's the closest analog (forwarded ref with `SectionRefreshHandle`, uses `SectionHeader`, calls `useHomeViewedEvent`, has a `handleViewAllTokens` for header tap → route). Here's the shape to mirror:

```248:300:app/components/Views/Homepage/Sections/Tokens/TokensSection.tsx
return (
  <View ref={sectionViewRef} onLayout={onLayout}>
    <Box gap={3}>
      <SectionHeader title={title} onPress={handleViewAllTokens} />
      {showTokensError ? (
        <ErrorState … />
      ) : isZeroBalanceAccount ? (
        <SectionRow>
          <PopularTokensList … />
        </SectionRow>
      ) : (
        <SectionRow>
          {displayTokenKeys.length === 0 && sortedTokenKeys.length === 0 ? (
            <TokenListSkeleton count={MAX_TOKENS_DISPLAYED} />
          ) : (
            displayTokenKeys.map((tokenKey, index) => (
              <TokenListItem
                key={…}
                assetKey={tokenKey}
                // ...
              />
            ))
          )}
        </SectionRow>
      )}
    </Box>
  </View>
);
```

For watchlist rows, **replace `TokenListItem` with `TrendingTokenRowItem`** (the Explore-style card, which is what Figma shows).

**SectionHeader prop API (for the "Watchlist" title + tap-to-expand behaviour):**

```17:63:app/component-library/components-temp/SectionHeader/SectionHeader.types.ts
export interface SectionHeaderProps {
  title: string | ReactNode;
  onPress?: () => void;
  justifyContent?: BoxJustifyContent;
  endIconName?: IconName;
  endIconColor?: IconColor;
  endAccessory?: ReactNode;
  style?: StyleProp<ViewStyle>;
  twClassName?: string;
  testID?: string;
}
```

### 3.3 Full-screen Watchlist view [CORRECTED component names]

- **Route registration** — add to `app/components/Nav/Main/MainNavigator.js`. Follow the **feature-flag-gated route** pattern already used for Perps / Predict / Money Home:

```1219:1244:app/components/Nav/Main/MainNavigator.js
{isPerpsEnabled && (
  <>
    <Stack.Screen
      name={Routes.PERPS.ROOT}
      component={PerpsScreenStack}
      options={{
        headerShown: false,
        ...slideFromRightAnimation,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.TUTORIAL}
      component={PerpsTutorialCarousel}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name={Routes.PERPS.MODALS.ROOT}
      component={PerpsModalStack}
      options={{
        ...clearStackNavigatorOptionsWithTransitionAnimation,
        presentation: 'transparentModal',
      }}
    />
  </>
)}
```

Use the same pattern:

```js
{
  isTokenWatchlistEnabled && (
    <Stack.Screen
      name={Routes.WATCHLIST.ROOT}
      component={TokenWatchlistScreen}
      options={{ headerShown: false, ...slideFromRightAnimation }}
    />
  );
}
```

- **Route constants** — add `Routes.WATCHLIST = { ROOT: 'Watchlist' }` in `app/constants/navigation/Routes.ts`.
- **Sort / filter / time bottom sheets to lift** — **[CORRECTED]** v1 said "lift the Explore sorting sheet"; the actual reusable sheets are all in `app/components/UI/Trending/components/TrendingTokensBottomSheet/` (exported via `index.ts`):
  - `TrendingTokenTimeBottomSheet`
  - `TrendingTokenNetworkBottomSheet`
  - `TrendingTokenPriceChangeBottomSheet`
- **Page chrome wrapper** — `app/components/UI/Trending/components/TokenListPageLayout/TokenListPageLayout.tsx` already mounts the network + price-change sheets. It's the single best component to reuse for the full-screen view:

```108:120:app/components/UI/Trending/components/TokenListPageLayout/TokenListPageLayout.tsx
<TrendingTokenNetworkBottomSheet
  isVisible={filters.showNetworkBottomSheet}
  onClose={() => filters.setShowNetworkBottomSheet(false)}
  onNetworkSelect={filters.handleNetworkSelect}
  selectedNetwork={filters.selectedNetwork}
  networks={allowedNetworks}
/>
<TrendingTokenPriceChangeBottomSheet
  isVisible={filters.showPriceChangeBottomSheet}
  onClose={() => filters.setShowPriceChangeBottomSheet(false)}
  onPriceChangeSelect={filters.handlePriceChangeSelect}
  selectedOption={filters.selectedPriceChangeOption}
  sortDirection={filters.priceChangeSortDirection}
/>
```

- **Reference screen to model after** — `app/components/UI/Trending/Views/TrendingTokensFullView/TrendingTokensFullView.tsx`. It already combines `TokenListPageLayout` + an extra time-range sheet. Basically your Watchlist fullscreen is "`TrendingTokensFullView` but with the data source swapped to `useTokenWatchlistQuery`".
- **Row component** — `TrendingTokenRowItem` (`app/components/UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem.tsx`), same price / market-cap / %-change layout:

```389:414:app/components/UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem.tsx
<Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
  {formatMarketStats(token.marketCap ?? 0, token.aggregatedUsdVolume ?? 0)}
</Text>
{/* ... */}
<Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
  {formatPriceWithSubscriptNotation(token.price)}
</Text>
{parseFloat(token.price) === 0 ? (
  <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>—</Text>
) : (
  hasPercentageChange && (
    <Text
      variant={TextVariant.BodySM}
      color={getPriceChangeColor(pricePercentChange)}
    >
      {getPriceChangePrefix(pricePercentChange, isPositiveChange)}
      {Math.abs(pricePercentChange).toFixed(2)}%
    </Text>
  )
)}
```

- **Per-item meatball menu (Swap / Buy / Remove):** `TrendingTokenRowItem` already exposes a tap handler; for the meatball you'll add a new bottom sheet mirroring the existing `TrendingTokenTimeBottomSheet` structure. No existing 3-action meatball to lift directly.

### 3.4 Full-screen empty CTA

No direct equivalent in the repo — this is mostly new UI. The closest reference for a "check-boxed list + 2 CTA buttons" pattern is the token selection during wallet import (search `app/components/Views/SRPManagement/`). Engineers should expect some original layout work here; v1's 2-day estimate is reasonable.

### 3.5 Swaps / Bridge "Select Token" — ⭐ tab [MAJOR CORRECTION]

**v1 assumed a tabbed Select Token screen. This is not what the codebase looks like today.**

The live screen is **`BridgeTokenSelector`** at `app/components/UI/Bridge/components/BridgeTokenSelector/BridgeTokenSelector.tsx`, registered as `Routes.BRIDGE.TOKEN_SELECTOR` (`'BridgeTokenSelector'`) in `app/components/UI/Bridge/routes.tsx`. It is a **single `FlatList`** with:

- A top search bar (client-side filter).
- A horizontal `NetworkPills` strip + a network-filter bottom sheet (driven by the Redux selector `selectTokenSelectorNetworkFilter`).
- Per-row `TokenSelectorItem` with balance.

**No tabs.** Example render:

```395:427:app/components/UI/Bridge/components/BridgeTokenSelector/BridgeTokenSelector.tsx
const renderToken = useCallback(
  ({ item }: ListRenderItemInfo<BridgeToken | null>) => {
    if (!item) return <SkeletonItem />;

    const isNoFeeAsset =
      route.params?.type === TokenSelectorType.Source
        ? item.noFee?.isSource
        : item.noFee?.isDestination;
    return (
      <TokenSelectorItem
        token={item}
        isSelected={
          selectedToken &&
          selectedToken.address === item.address &&
          selectedToken.chainId === item.chainId
        }
        onPress={handleTokenPress}
        networkImageSource={getNetworkImageSource({ chainId: item.chainId })}
        isNoFeeAsset={isNoFeeAsset}
      >
        <ButtonIcon
          iconName={IconName.Info}
          size={ButtonIconSize.Sm}
          onPress={() => handleInfoButtonPress(item)}
          iconProps={{ color: IconColor.IconAlternative }}
        />
      </TokenSelectorItem>
    );
  },
  // ...
);
```

**Implementation options for the ⭐ tab** — pick with PM + Bridge team:

- **Option A (closest to v1 intent):** Add a tab bar at the top of `BridgeTokenSelector` with two tabs: "All" (default, existing behaviour) and "⭐ Watchlist" (new, `useTokenWatchlistQuery` with balance hydration). Bigger PR — touches Bridge-owned code; needs a Bridge engineer review.
- **Option B (cheaper, less UX-disruptive):** Add a ⭐ filter chip next to the existing `NetworkPills`. Functionally equivalent. Much smaller diff.

Our **recommendation: Option B for V1**, Option A in a follow-up if product feedback demands it. **Flag TASK-2.5 to PM with this decision point before estimating.**

Other corrections for v1 §3.5:

- The wallet-tab-style `TokenListItem` (`app/components/UI/Tokens/TokenList/TokenListItem/TokenListItem.tsx`) is the **wallet** row, not the Bridge row. The Bridge row is `TokenSelectorItem`. Pick one consistently based on which screen gets the feature.
- "Owned by Swaps team" — the current token selector is owned by the **Bridge** team (Swaps was subsumed). Coordinate accordingly.

### 3.6 Explore Trending Tokens — ⭐ filter [CONFIRMED]

- Main full-screen view: `app/components/UI/Trending/Views/TrendingTokensFullView/TrendingTokensFullView.tsx`.
- Tab entry point (Explore home): `app/components/Views/TrendingView/TrendingView.tsx` — exports `ExploreFeed`, registered as `Routes.TRENDING_FEED`.
- The ⭐ chip slots into the existing filter strip inside `TokenListPageLayout`. Reuse `filters` object.

---

## 4. Analytics [CORRECTED approach]

Use **`useAnalytics`**, not `useMetrics`:

```91:92:app/components/Views/AccountSelector/AccountSelector.tsx
const { trackEvent, createEventBuilder } = useAnalytics();
```

Call pattern:

```220:234:app/components/Views/AccountSelector/AccountSelector.tsx
trackEvent(
  createEventBuilder(MetaMetricsEvents.SWITCHED_ACCOUNT)
    .addProperties({
      source: 'Wallet Tab',
      number_of_accounts: accounts?.length,
    })
    .build(),
);
```

**New event names to add** in `app/core/Analytics/MetaMetrics.events.ts` (within the existing `EVENT_NAME` enum and `events` object, using `generateOpt(...)`):

- `WATCHLIST_ITEM_ADDED`
- `WATCHLIST_ITEM_REMOVED`
- `WATCHLIST_VIEWED` (fullscreen)
- `WATCHLIST_HOME_SECTION_VIEWED` (fired via the existing `useHomeViewedEvent` hook — pattern already used by every home section)
- `WATCHLIST_ITEM_OPENED` (with `source` discriminator)
- `WATCHLIST_SWAP_INITIATED` (fires from the Bridge ⭐ tab/filter)

Home-section view event is already modelled consistently for every section via `useHomeViewedEvent` (`app/components/Views/Homepage/hooks/useHomeViewedEvent.ts`). **Reuse it**, do not roll your own.

**`source` enum values** — keep v1's proposed values (`watchlist_home`, `watchlist_fullscreen`, `explore_watchlist_filter`, `swaps_watchlist_tab`).

---

## 5. Feature flag [CORRECTED]

- **Package:** `@metamask/remote-feature-flag-controller`. The mobile app pulls values from LaunchDarkly via the controller wired in `app/core/Engine/controllers/remote-feature-flag-controller-init.ts`. Nothing to configure there.
- **Mobile never declares LD keys in a single typed enum.** Flags are read as free-form string keys from the merged `RemoteFeatureFlagController.remoteFeatureFlags + localOverrides` (see `app/selectors/featureFlagController/index.ts`). So adding a new flag is literally: add an LD key + write a selector.
- **Selector location:** create `app/selectors/featureFlagController/tokenWatchlist/index.ts` + `index.test.ts` (mirrors `ramps/rampsUnifiedBuyV2.ts`).

Drop-in copy-paste (edit the key):

```ts
// app/selectors/featureFlagController/tokenWatchlist/index.ts
import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

export const TOKEN_WATCHLIST_FLAG_KEY = 'tokenWatchlistEnabled';

export const selectTokenWatchlistEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag = remoteFeatureFlags[
      TOKEN_WATCHLIST_FLAG_KEY
    ] as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
```

**Hook wrapper (optional but convenient):**

```ts
// app/components/UI/TokenWatchlist/hooks/useTokenWatchlistEnabled.ts
import { useSelector } from 'react-redux';
import { selectTokenWatchlistEnabled } from '../../../../selectors/featureFlagController/tokenWatchlist';

export const useTokenWatchlistEnabled = () =>
  useSelector(selectTokenWatchlistEnabled);
```

Matches `app/components/UI/Ramp/hooks/useRampsUnifiedV2Enabled.ts`.

---

## 6. Out of scope (V1) — unchanged

Same as v1.

---

## 7. Risks / open questions — updated

### 7.0 Resolved in this spec (do not re-litigate)

| Topic                                                                               | Resolution                                                                                                                                                  |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UserStorageController` behind `ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)` | Snaps are GA → treat as always-on. **Do not add code fences** in watchlist code. Handle `controller === undefined` defensively inside the hooks (see §2.2). |
| Multi-SRP `entropySourceId` scoping                                                 | V1 **does not pass** `entropySourceId`. Watchlist uses the controller's default scoping. Per-SRP scoping is a future-additive change.                       |
| Cache scoping across account switches                                               | Not a concern — single global blob, single query key.                                                                                                       |
| Upstream `@metamask/profile-sync-controller` PR for schema                          | Not needed. Schema enforcement deprecated in v28.x.                                                                                                         |

### 7.1 Engineering risks (technical, owned by eng)

1. **Bridge Select Token integration shape (TASK-2.5)** — Option A (add tabs) vs Option B (⭐ filter chip). See §3.5. Ticket can't be accurately estimated until this is picked.
2. **Blob size cap** — Soft-cap at 500 items, enforced client-side in the add mutation. If a user somehow exceeds it (older device with a legacy blob), the read path still succeeds; writes fail with a clear error. Product may want to raise/lower — defer to §7.2.
3. **Hydration fan-out** — If a user has 100+ watchlist items, the batched Token API call may be slow. Plan of attack if profiling flags this: split `useTokenWatchlistQuery` into `useTokenWatchlistMarketDataQuery` + `useTokenWatchlistBalancesQuery` (v1 §2.3).
4. **Conflict resolution** — Last-write-wins across devices. Acceptable. Document explicitly in the PR description.
5. **Blob shape migration** — The `version: 1` field is in place, but there's no migration harness today for `UserStorageController`-backed blobs (unlike Redux store migrations under `app/store/migrations/`). If we ever ship a `version: 2`, the read path needs to handle both; Superstruct schema evolution is how we'd do it. Not V1 work — but don't remove `version` from the blob, and add a short comment explaining why.
6. **Error surfacing** — Writes that fail (network blip, auth lapse) roll back the optimistic update and reject the mutation. Every UI call site must show a toast on failure (spec assumes this; make it explicit in view tests).
7. **`ControllersGate` timing** — The `QueryClientProvider` in `app/components/Views/Root/index.tsx` wraps `ControllersGate`, so a component can mount and fire the watchlist query **before** controllers are initialized. The `getController()` helper in §2.2 handles this (returns `null` → empty blob). React Query will refetch once the query becomes stale; add a manual `invalidateQueries` call after controller-gate unlock **if** empty-blob-on-boot causes a UX flash. (Monitor in QA — don't over-engineer up front.)

### 7.2 Open questions for product / PM (answers needed to finalize tickets)

Flagging these up front so Amarildo's review is a single pass rather than a back-and-forth:

| #   | Question                                                                                                                                                                                                                                                              | Why we need the answer                                                                                                                                                                     | Ticket(s) blocked                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Q1  | **Blob size cap** — is 500 items the right ceiling? Is there any realistic user who'd hit it? What message do we show when they do?                                                                                                                                   | We have to pick an error copy and either (a) hide the ⭐ icon when at cap or (b) show an error toast.                                                                                      | TASK-1.2                                         |
| Q2  | **Empty-state curated IDs** — confirm the 3 defaults are BTC, ETH, SOL (as the spec assumes). If the list ever changes, do we hardcode in app or pull from the Trending Tokens API?                                                                                   | Hardcoded is 0.5d. Remote-configurable is 1–1.5d (one more server endpoint).                                                                                                               | TASK-1.4, TASK-2.4                               |
| Q3  | **Home section order** — where does Watchlist sit in `enabledSections`? Above Tokens? Below Tokens? Below Cash?                                                                                                                                                       | Purely a position decision but affects the PR — changes the memo block in `Homepage.tsx`.                                                                                                  | TASK-2.2                                         |
| Q4  | **Home section when empty** — does Watchlist render _at all_ on the home page when the user has 0 items (showing an inline CTA), or does the whole section hide and only appear after the first add?                                                                  | Affects the `enabledSections` filter and the inline empty CTA scope.                                                                                                                       | TASK-2.2                                         |
| Q5  | **Result ordering in the watchlist** — the stored blob is a flat array. On render we can show (a) user-insertion order, (b) volume-sorted (via the Token API metadata hydration), (c) the user's last chosen sort from the fullscreen view (persisted where?). Which? | v1 §3.2 implies volume-sorted, but that requires the Token API to return pre-sorted results **or** a client sort after hydration. Need confirmation.                                       | TASK-1.1, TASK-2.2, TASK-2.3                     |
| Q6  | **Unknown / delisted asset** — if Token API has no metadata for a watchlisted asset (new listing, delisted, unsupported chain), what does the row render? Hide? Show "Price unavailable"? Auto-remove on failure?                                                     | Affects the hydration mapper + row component. Auto-remove is risky (user loses data); "Price unavailable" is safe.                                                                         | TASK-1.1, TASK-2.3                               |
| Q7  | **Same token on multiple chains** — USDC exists on Ethereum + Base + Optimism + …. CAIP-19 treats each as a distinct asset ID. Is adding "USDC" from Token Details on Ethereum and "USDC" from Base **two separate watchlist entries** or deduped to one?             | Dedup logic: pure string-compare today → 2 entries. A "logical asset" merge would require product taxonomy we don't have. Recommend keeping them separate for V1 and flagging in the spec. | TASK-1.2                                         |
| Q8  | **Perps tokens in V1** — v1 §3.3 says "EVM tokens only, Perps deferred." But a user can navigate to Token Details for a Perps market; do we hide the ⭐ icon there, or allow the add but skip it from the Perps surface?                                              | Hide-the-star is one line at the call site. Allow-but-skip requires filter logic in every view.                                                                                            | TASK-2.1                                         |
| Q9  | **Unauthenticated / wallet-locked users** — `UserStorageController` requires the user to be signed into profile-sync. What happens if they aren't? Hide the star on Token Details? Show a "sign in to use watchlist" CTA? Silent no-op?                               | v1 doesn't mention. Likely "hide the star" is safest for V1. Confirm.                                                                                                                      | TASK-2.1, TASK-2.2, TASK-2.3, TASK-2.5, TASK-2.6 |
| Q10 | **Swaps-originated-from-watchlist event** — confirm the event name + properties (`asset_id`, `source: 'swaps_watchlist_tab'`, `swap_amount`?).                                                                                                                        | Schema review (TASK-3.1). Just confirming now avoids a PR-review revision.                                                                                                                 | TASK-2.5, TASK-3.1                               |
| Q11 | **Toast copy** — exact strings for the 4 toasts: "Added to Watchlist" / "Removed from Watchlist" / "Couldn't save, try again" / "Couldn't load watchlist".                                                                                                            | Localization team needs these early.                                                                                                                                                       | TASK-2.1                                         |
| Q12 | **"Manage Watchlist" link in toast** — v1 §3.1 flags this as deferred. Confirm V1 cuts the link and the toast is just a ✓ confirmation, so we can write the ticket cleanly.                                                                                           | Affects TASK-2.1 scope + test.                                                                                                                                                             | TASK-2.1                                         |
| Q13 | **Analytics PII review** — we'll emit `asset_id` (CAIP-19) on every add/remove/open event. Public asset IDs are non-PII, but confirm with privacy.                                                                                                                    | Analytics schema review.                                                                                                                                                                   | TASK-3.1                                         |
| Q14 | **Debounce rapid star/unstar** — should we debounce double-taps (e.g., 300 ms collapse), or let every tap hit the controller?                                                                                                                                         | Controller calls are cheap but cause toast spam.                                                                                                                                           | TASK-1.5, TASK-2.1                               |

---

# 8. Jira task breakdown — validated

Changes from v1 are marked inline. Estimates that didn't change are kept.

## Phase 0 — Foundation `[blocks → all Phase 2/3 UI]`

### TASK-0.1 — LaunchDarkly flag + selector `tokenWatchlistEnabled` — **[refined]**

- Register flag in LaunchDarkly (both envs).
- Add selector module `app/selectors/featureFlagController/tokenWatchlist/index.ts` (use the snippet in §5 verbatim).
- Add `app/selectors/featureFlagController/tokenWatchlist/index.test.ts` — mirror `ramps/rampsUnifiedBuyV2.test.ts`.
- Add optional hook `useTokenWatchlistEnabled` at `app/components/UI/TokenWatchlist/hooks/useTokenWatchlistEnabled.ts`.
- **No changes needed** to a central flag types file — mobile does not maintain one.
- **Estimate:** 0.5d (unchanged).

### TASK-0.2 — UserStorage contract: short ADR — **[much smaller than v1]**

- Document the chosen path (`tokenWatchlist.main`), blob shape (`{ assets, version }`), no-`entropySourceId` decision, and the defensive read-path behaviour (empty-blob fallback on controller-unavailable / parse error / Superstruct failure) in a 1-page ADR under `docs/` so future maintainers know why the hooks don't throw on boot.
- No upstream `@metamask/profile-sync-controller` PR (schema enforcement deprecated in v28.x).
- No platform / identity coordination needed (resolved in §7.0).
- **Estimate:** 0.25d (was 0.5–1d in v1).

---

## Phase 1 — Business logic (TanStack Query hooks) `[blocks → all UI tasks]`

> **New hook location:** `app/components/UI/TokenWatchlist/hooks/` — not `app/components/hooks/TokenWatchlist/`. See §2.3.

### TASK-1.1 — `useTokenWatchlistQuery`

- Hook fetches blob via `Engine.context.UserStorageController.performGetStorage('tokenWatchlist.main')`, `JSON.parse`s, validates with Superstruct.
- Hydrates via `useTrendingRequest` (Explore-style) and/or `selectSortedAssetsBySelectedAccountGroupForChainIdsByBalance` (balance-style).
- Returns typed `WatchlistItem[]`.
- Query key: `tokenWatchlistQueryKeys.blob` (scope with `entropySourceId` if Risk #2 resolves that way).
- **Estimate:** 1.5d (unchanged).

**Copy-ready sketch** (trim to taste):

```ts
// app/components/UI/TokenWatchlist/schemas/watchlistBlob.ts
import {
  array,
  defaulted,
  literal,
  object,
  string,
  union,
  number,
} from '@metamask/superstruct';

export const WatchlistBlobSchema = defaulted(
  object({
    assets: defaulted(array(string()), () => []),
    version: defaulted(union([literal(1)]), () => 1 as const),
  }),
  () => ({ assets: [] as string[], version: 1 as const }),
);
export type WatchlistBlob = { assets: string[]; version: 1 };
```

```ts
// app/components/UI/TokenWatchlist/hooks/useTokenWatchlist.keys.ts
export const tokenWatchlistQueryKeys = {
  all: ['tokenWatchlist'] as const,
  blob: ['tokenWatchlist', 'blob'] as const,
  suggested: ['tokenWatchlist', 'suggested'] as const,
};
```

```ts
// app/components/UI/TokenWatchlist/hooks/useTokenWatchlistQuery.ts
import { useQuery } from '@tanstack/react-query';
import { tokenWatchlistQueryKeys } from './useTokenWatchlist.keys';
import { readWatchlistBlob } from './watchlistStorage';
import type { WatchlistBlob } from '../schemas/watchlistBlob';

export const useTokenWatchlistQuery = () =>
  useQuery<WatchlistBlob>({
    queryKey: tokenWatchlistQueryKeys.blob,
    queryFn: readWatchlistBlob,
    staleTime: 60_000,
  });
```

(`readWatchlistBlob` handles the controller-undefined, JSON-error, and Superstruct-error branches — see §2.2.)

### TASK-1.2 — `useTokenWatchlistAddItemMutation`

- Accepts `CaipAssetType | CaipAssetType[]`.
- Reads current blob via query cache first, storage fallback; dedupe; write; invalidate `tokenWatchlistQueryKeys.blob`.
- Optimistic update recommended.
- Pattern reference: `app/components/UI/Card/hooks/useCardFreeze.ts`.
- **Estimate:** 1d (unchanged).

**Copy-ready sketch:**

```ts
// app/components/UI/TokenWatchlist/hooks/useTokenWatchlistAddItemMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CaipAssetType } from '@metamask/utils';
import { tokenWatchlistQueryKeys } from './useTokenWatchlist.keys';
import {
  readWatchlistBlob,
  writeWatchlistBlob,
  EMPTY_BLOB,
} from './watchlistStorage';
import type { WatchlistBlob } from '../schemas/watchlistBlob';

const MAX_ITEMS = 500;

export const useTokenWatchlistAddItemMutation = () => {
  const qc = useQueryClient();
  return useMutation<WatchlistBlob, Error, CaipAssetType | CaipAssetType[]>({
    mutationFn: async (input) => {
      const ids = (Array.isArray(input) ? input : [input]).map(String);
      const cached = qc.getQueryData<WatchlistBlob>(
        tokenWatchlistQueryKeys.blob,
      );
      const current = cached ?? (await readWatchlistBlob());
      const merged = Array.from(new Set([...current.assets, ...ids]));
      if (merged.length > MAX_ITEMS) {
        throw new Error(`Watchlist cap (${MAX_ITEMS}) reached`);
      }
      const next: WatchlistBlob = { ...current, assets: merged };
      await writeWatchlistBlob(next); // throws on controller-unavailable / network
      return next;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: tokenWatchlistQueryKeys.blob });
      const prev = qc.getQueryData<WatchlistBlob>(tokenWatchlistQueryKeys.blob);
      const ids = (Array.isArray(input) ? input : [input]).map(String);
      qc.setQueryData<WatchlistBlob>(tokenWatchlistQueryKeys.blob, (old) => ({
        assets: Array.from(new Set([...(old ?? EMPTY_BLOB).assets, ...ids])),
        version: 1,
      }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(tokenWatchlistQueryKeys.blob, ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: tokenWatchlistQueryKeys.blob });
    },
  });
};
```

### TASK-1.3 — `useTokenWatchlistRemoveItemMutation`

Same shape, filter instead of union. **Estimate:** 1d (unchanged).

### TASK-1.4 — `useSuggestedWatchlistItemsQuery`

- Curated 3 asset IDs (BTC/ETH/SOL — confirm).
- Hydrate via Trending Tokens API (same client as `useTrendingRequest`).
- **Estimate:** 0.5d (unchanged).

### TASK-1.5 — Convenience hook `useTokenWatchlist(assetId)` **[NEW]**

- Combines query + add/remove into `{ isWatched, toggle }` for the ⭐ icon call site.
- Keeps Token Details free of query-cache boilerplate.
- **Estimate:** 0.25d.

---

## Phase 2 — UI surfaces (parallelizable after Phase 1)

### TASK-2.1 — ⭐ icon on Token Details **[paths corrected]**

- Target file: `app/components/UI/TokenDetails/components/TokenDetailsInlineHeader.tsx` (or `TokenDetailsActions.tsx` — decide with design).
- Pass `caip19AssetId` (already computed in `TokenDetails.tsx` lines 140–151) down as a prop.
- Use `useTokenWatchlist(assetId)` convenience hook.
- Toast: `useContext(ToastContext)` + `toastRef?.current?.showToast(…)`; reference pattern at `app/components/UI/Rewards/hooks/useRewardsToast.tsx` lines 48–60.
- Analytics: `useAnalytics()` → `MetaMetricsEvents.WATCHLIST_ITEM_ADDED` / `_REMOVED`.
- Gate the star render behind `useTokenWatchlistEnabled()`.
- Unit test + `.view.test.tsx` snapshot for both states.
- **Estimate:** 1d (unchanged).

### TASK-2.2 — Home page `WatchlistHomeSection` (top 3) **[paths corrected]**

- New file: `app/components/Views/Homepage/Sections/Watchlist/WatchlistHomeSection.tsx` (mirrors `Sections/Tokens/TokensSection.tsx`).
- Model the component on `TokensSection` (forwardRef + `SectionRefreshHandle` + `useHomeViewedEvent`).
- Reuse `SectionHeader` from `app/component-library/components-temp/SectionHeader` and `TrendingTokenRowItem` for rows.
- Register in `HomeSectionNames` (`app/components/Views/Homepage/hooks/useHomeViewedEvent.ts`) as `WATCHLIST: 'watchlist'`.
- Thread through the `enabledSections` memo in `Homepage.tsx` (both control + separate-trending branches).
- Pass the refresh ref through `Homepage.refresh` (line ~188 of `Homepage.tsx`).
- Empty-state CTA → `navigation.navigate(Routes.WATCHLIST.ROOT, { emptyState: true })` or similar.
- Gated by flag — section filtered out when `isTokenWatchlistEnabled === false`.
- Unit tests + view test. **Estimate:** 1.5d (unchanged).

### TASK-2.3 — Full-screen Watchlist route **[paths corrected]**

- Register `Routes.WATCHLIST.ROOT = 'Watchlist'` in `app/constants/navigation/Routes.ts`.
- Register flag-gated `Stack.Screen` in `app/components/Nav/Main/MainNavigator.js` (pattern at lines 1219–1244 for Perps).
- New screen at `app/components/UI/TokenWatchlist/Views/TokenWatchlistScreen.tsx`.
- **Wrap with `TokenListPageLayout`** (`app/components/UI/Trending/components/TokenListPageLayout/TokenListPageLayout.tsx`) to inherit network + price-change sheets. Pass an `extraBottomSheets` prop for the time-range sheet (pattern at `TrendingTokensFullView.tsx` lines 251–258) **if** needed.
- New 3-action meatball bottom sheet — no direct analog to lift; pattern after `TrendingTokenTimeBottomSheet`.
- Sticky "See more tokens" CTA → `navigation.navigate(Routes.TRENDING_FEED)`.
- **Estimate:** 2.5d (unchanged; meatball sheet is the wildcard).

### TASK-2.4 — Full-screen empty CTA

- New file `app/components/UI/TokenWatchlist/components/WatchlistEmptyState.tsx`.
- Uses `useSuggestedWatchlistItemsQuery` + `useTokenWatchlistAddItemMutation`.
- Compose with `TrendingTokenRowItem` + a right-aligned Checkbox from `@metamask/design-system-react-native`.
- **Estimate:** 2d (unchanged).

### TASK-2.5 — Bridge (ex-Swaps) Select Token — ⭐ surface **[MAJOR rescope decision]**

- **Coordinate with Bridge team**, not Swaps. Feature lives in `app/components/UI/Bridge/`.
- Decide Option A (add tabs) vs Option B (add ⭐ filter chip) — see §3.5.
- For Option B (recommended):
  - Add a ⭐ chip next to the existing `NetworkPills` in `BridgeTokenSelector.tsx`.
  - When active, swap the data source to `useTokenWatchlistQuery` and filter `allTokens` against watchlist asset IDs.
  - Local search already works client-side — nothing to do.
  - Empty states: reuse `WatchlistEmptyState`.
- Analytics: `MetaMetricsEvents.WATCHLIST_SWAP_INITIATED` fires in `handleTokenPress` when `⭐ active`.
- **Estimate:**
  - Option B: 1.5d
  - Option A: 2.5d (rebuild tabs + larger Bridge-team review)

### TASK-2.6 — Explore Trending Tokens — ⭐ filter

- Add the same ⭐ chip logic to `TokenListPageLayout` consumers on the `TrendingTokensFullView`.
- Reuse `WatchlistEmptyState` on empty.
- Analytics: `source: 'explore_watchlist_filter'`.
- Gated by flag.
- **Estimate:** 1d (unchanged).

---

## Phase 3 — QA, analytics review, polish

### TASK-3.1 — Analytics schema review with Amarildo

- Add all new events in `app/core/Analytics/MetaMetrics.events.ts` (within `EVENT_NAME` + `events`).
- Verify Mixpanel receives all expected events in dev.
- **Estimate:** 0.5d.

### TASK-3.2 — E2E (Detox) smoke test

- Live under `e2e/` (the repo's Detox tests actually live under `e2e/`, not `tests/smoke/` for Detox — verify with the e2e testing guide in `.cursor/rules/e2e-testing-guidelines.mdc` before placing files).
- Scenario: add → home top-3 appears → fullscreen → remove → empty state.
- **Estimate:** 1d.

### TASK-3.3 — Cross-device sync manual QA — unchanged.

### TASK-3.4 — Flag rollout plan — unchanged.

---

## Phase 4 — V2 (backlog) — unchanged from v1.

---

## Rough total (V1)

| Phase     | Days                                                                                |
| --------- | ----------------------------------------------------------------------------------- |
| Phase 0   | ~0.75d (TASK-0.1 0.5d + TASK-0.2 0.25d; all platform/identity coordination dropped) |
| Phase 1   | ~4.25d (TASK-1.5 +0.25d; error-handling helpers added but no net change)            |
| Phase 2   | ~9–10d (TASK-2.5 depends on Option A/B; assumes B)                                  |
| Phase 3   | ~2.5d                                                                               |
| **Total** | **~16.5d serial / ~9–10d with 2 engineers in parallel**                             |

---

## Appendix A — Copy-paste cheat sheet

| Thing engineer needs                         | File path                                                                             | Symbol                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| UserStorageController instance               | `Engine.context.UserStorageController`                                                | `performGetStorage` / `performSetStorage`                                        |
| Token Details screen                         | `app/components/UI/TokenDetails/Views/TokenDetails.tsx`                               | `TokenDetailsRouteWrapper`                                                       |
| Token Details inline header (⭐ target)      | `app/components/UI/TokenDetails/components/TokenDetailsInlineHeader.tsx`              | `TokenDetailsInlineHeader`                                                       |
| CAIP-19 computation on Token Details         | `app/components/UI/TokenDetails/Views/TokenDetails.tsx` lines 140–151                 | `caip19AssetId`                                                                  |
| Trending row component                       | `app/components/UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem.tsx` | default export                                                                   |
| Page layout w/ network + price-change sheets | `app/components/UI/Trending/components/TokenListPageLayout/TokenListPageLayout.tsx`   | `TokenListPageLayout`                                                            |
| Time-range sheet                             | `app/components/UI/Trending/components/TrendingTokensBottomSheet/`                    | `TrendingTokenTimeBottomSheet`                                                   |
| Homepage container                           | `app/components/Views/Homepage/Homepage.tsx`                                          | `Homepage`                                                                       |
| Home section names enum                      | `app/components/Views/Homepage/hooks/useHomeViewedEvent.ts`                           | `HomeSectionNames`                                                               |
| Home section template                        | `app/components/Views/Homepage/Sections/Tokens/TokensSection.tsx`                     | `TokensSectionMain`                                                              |
| SectionHeader                                | `app/component-library/components-temp/SectionHeader/SectionHeader.tsx`               | default export                                                                   |
| Bridge token selector screen                 | `app/components/UI/Bridge/components/BridgeTokenSelector/BridgeTokenSelector.tsx`     | `BridgeTokenSelector`                                                            |
| Bridge token row                             | `app/components/UI/Bridge/components/TokenSelectorItem/TokenSelectorItem.tsx`         | `TokenSelectorItem`                                                              |
| Main navigator                               | `app/components/Nav/Main/MainNavigator.js`                                            | `MainNavigator`                                                                  |
| Route constants                              | `app/constants/navigation/Routes.ts`                                                  | `Routes`                                                                         |
| QueryClient singleton                        | `app/core/ReactQueryService/ReactQueryService.ts`                                     | default export                                                                   |
| QueryClientProvider mount                    | `app/components/Views/Root/index.tsx`                                                 | JSX at lines 83–98                                                               |
| Feature-flag root selector                   | `app/selectors/featureFlagController/index.ts`                                        | `selectRemoteFeatureFlags`                                                       |
| Feature-flag selector template               | `app/selectors/featureFlagController/ramps/rampsUnifiedBuyV2.ts`                      | `selectRampsUnifiedBuyV2Enabled`                                                 |
| Feature-flag hook template                   | `app/components/UI/Ramp/hooks/useRampsUnifiedV2Enabled.ts`                            | `useRampsUnifiedV2Enabled`                                                       |
| Analytics hook                               | `app/components/hooks/useAnalytics/useAnalytics.ts`                                   | `useAnalytics`                                                                   |
| Analytics events catalog                     | `app/core/Analytics/MetaMetrics.events.ts`                                            | `EVENT_NAME`, `events`, `MetaMetricsEvents`                                      |
| Analytics call-site example                  | `app/components/Views/AccountSelector/AccountSelector.tsx` lines 91–234               | `trackEvent(createEventBuilder(...).build())`                                    |
| Toast context                                | `app/component-library/components/Toast/Toast.context.tsx`                            | `ToastContext`, `ToastContextWrapper`                                            |
| Toast call-site example                      | `app/components/UI/Rewards/hooks/useRewardsToast.tsx` lines 48–60                     | `useRewardsToast`                                                                |
| Schema validator                             | `@metamask/superstruct` (version `^3.2.1` in `package.json`)                          | `object`, `array`, `defaulted`, `create`, `string`, `number`, `literal`, `union` |
| Schema call-site example                     | `app/components/UI/Predict/schemas/flags.ts`                                          | `PredictFeeCollectionSchema`                                                     |
| CAIP-19 parse helpers                        | `app/components/UI/Rewards/utils/formatUtils.ts` lines 450–468                        | `parseCaip19`                                                                    |
| Imperative UserStorage action examples       | `app/actions/identity/index.ts` lines 21–40                                           | `setIsBackupAndSyncFeatureEnabled`, `syncContactsWithUserStorage`                |
| TanStack Query `useQuery` example            | `app/components/UI/Ramp/hooks/useRampsPaymentMethods.ts`                              | `paymentMethodsQuery`                                                            |
| TanStack Query `useMutation` example         | `app/components/UI/Card/hooks/useCardFreeze.ts`                                       | `useCardFreeze`                                                                  |

---

## Appendix B — AB test hook

If a non-LaunchDarkly A/B test is wanted for the ⭐ icon rollout, the repo already has `useABTest` (`app/hooks/useABTest.ts`) and a reference usage pattern at `app/components/UI/TokenDetails/components/abTestConfig.ts` (`STICKY_FOOTER_SWAP_LABEL_*`). Modelled pattern for a "watchlist star visible/hidden" experiment:

```ts
import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../util/analytics/abTestAnalytics.types';

export const TOKEN_DETAILS_WATCHLIST_STAR_AB_KEY =
  'tokenDetailsWatchlistStarAbTest';

export enum WatchlistStarVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export const WATCHLIST_STAR_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: TOKEN_DETAILS_WATCHLIST_STAR_AB_KEY,
    validVariants: Object.values(WatchlistStarVariant),
    eventNames: [
      EVENT_NAME.TOKEN_DETAILS_OPENED,
      // add WATCHLIST_ITEM_ADDED / REMOVED once registered in EVENT_NAME
    ],
  };
```

Only worth the complexity if product wants a controlled experiment — otherwise stick with the straight LaunchDarkly flag from §5.
