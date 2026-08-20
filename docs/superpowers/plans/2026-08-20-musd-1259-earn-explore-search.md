# MUSD-1259 Earn Explore Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Earn as a gated, feed-native category in Explore Search, with a pinned Money account row, ranked searchable Earn assets, correct navigation, visible degraded states, and preserved existing search behavior.

**Architecture:** Extract a full, reusable Earn projection from the existing five-slot homepage projection. Mount one `useEarnSearchFeed` at the Explore Search boundary; it ranks, filters, and constructs discriminated Money/asset items before the existing search feed pipeline applies its three-row All-results cap. Extend the existing feed types and renderers for Earn, while keeping the fixed-card homepage contract isolated.

**Tech Stack:** React Native, TypeScript, React Navigation, Redux selectors, React hooks, `@metamask/design-system-react-native`, FlashList, Jest, React Native Testing Library, and the repository component-view test harness.

## Global Constraints

- Gate all Earn search content with the existing Explore Earn section feature flag.
- Show the Money account above Earn assets whenever Money account visibility rules allow it.
- Keep the Money account visible for every search query.
- In All results, show at most three Earn rows: Money plus two assets when Money is visible, or three assets when it is not.
- In the Earn filter, show Money plus every eligible Earn asset matching the query.
- Keep existing Explore Search feeds and their relative ordering unchanged.
- Insert Earn after Perps.
- Selecting View all in the Earn section activates the Earn filter.
- Opening Explore Search from either action in the existing Earn card section preselects the Earn filter.
- All API-backed hooks and requests must be mocked in tests.
- Do not add Appium E2E coverage.
- Do not commit implementation changes unless explicitly requested by the user.
- Pause for human approval after every implementation task; do not start the next task until approval is received.

## File Map

### Earn projection and shared presentation

- Modify `app/components/UI/Earn/utils/earnSection/rankEarnSectionAssets.ts`
  - Add `rankEarnAssets(assets)` returning every enriched, fully ranked asset.
  - Keep `rankEarnSectionAssets(assets, limit)` as the five-slot slice/padding adapter.
- Modify `app/components/UI/Earn/utils/earnSection/index.ts`
  - Export `rankEarnAssets`.
- Modify `app/components/UI/Earn/utils/earnSection/rankEarnSectionAssets.test.ts`
  - Cover the full projection and retain existing slice/padding assertions.
- Create `app/components/UI/Earn/components/EarnAssetIcon/EarnAssetIcon.tsx`
  - Reuse the existing 40 px token avatar and bottom-right network badge.
- Create `app/components/UI/Earn/utils/earnSection/getEarnAssetRateText.ts`
  - Centralize highest-rate APY/APR/unavailable copy while allowing callers to choose action-copy (`Get ...`) based on their row contract.
- Modify `app/components/UI/Earn/components/EarnSection/EarnSection.tsx`
  - Consume the shared icon/rate helpers without changing homepage behavior or its five-slot contract.

### Earn search feed

- Create `app/components/Views/TrendingView/feeds/earn/earnSearchTypes.ts`
  - Define stable discriminated Money and asset item types.
- Create `app/components/Views/TrendingView/feeds/earn/useEarnSearchFeed.ts`
  - Mount `useEarnAssetCatalogue` once, rank/filter once per dependency change, expose progressive loading, errors, and retry.
- Create `app/components/Views/TrendingView/feeds/earn/useEarnSearchFeed.test.ts`
  - Mock catalogue, Money visibility/balance/navigation hooks and assert feed semantics.
- Create `app/components/Views/TrendingView/feeds/earn/EarnMoneyAccountRow.tsx`
  - Render Money icon, New tag, balance/Get started, APY, independent skeletons, and Money navigation.
- Create `app/components/Views/TrendingView/feeds/earn/EarnMoneyAccountRow.test.tsx`
  - Cover Money loading, balance, APY, accessibility, and navigation states.
- Create `app/components/Views/TrendingView/feeds/earn/EarnAssetRow.tsx`
  - Render token/network identity, token amount, rate copy, and held/discovery navigation.
- Create `app/components/Views/TrendingView/feeds/earn/EarnAssetRow.test.tsx`
  - Cover held/discovery copy, missing rates, network badge, stable IDs, and navigation.

### Explore Search integration

- Modify `app/components/Views/TrendingView/search/useExploreSearch.ts`
  - Add `earn` to `SearchFeedId`, register the gated Earn section after Perps, and carry feed errors/retry metadata.
- Modify `app/components/Views/TrendingView/search/searchTypes.ts`
  - Add an inline error list item type for All-results rendering.
- Modify `app/components/Views/TrendingView/search/SearchFeedRow.tsx`
  - Resolve Earn item IDs and render Earn Money/asset rows and skeletons.
- Modify `app/components/Views/TrendingView/search/viewMoreLabel.ts`
  - Treat Earn as a fully client-loaded local feed.
- Modify `app/components/Views/TrendingView/search/viewMoreLabel.test.ts`
  - Assert Earn uses the existing View all/View X more rules.
- Modify `app/components/Views/TrendingView/search/ExploreSearchResults.tsx`
  - Keep errored Earn sections visible and render their inline warning in All results.
- Create `app/components/Views/TrendingView/search/SearchFeedError.tsx`
  - Render the visible warning, stable test ID, accessible label, and async Retry action.
- Modify `app/components/Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen.tsx`
  - Render Earn errors in the full feed view and consume the initial pill once.
- Modify `app/components/Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen.types.ts`
  - Add optional `initialPill?: string` route input so invalid runtime values can safely fall back to All.
- Modify `app/components/Views/TrendingView/search/useExploreSearch.test.ts`
  - Mock the feature flag and Earn feed; assert gating, ordering, item/error mapping, and no changes to other feeds.
- Modify `app/components/Views/TrendingView/search/SearchFeedRow.test.tsx`
  - Assert Earn item IDs, row dispatch, and search analytics.
- Modify `app/components/Views/TrendingView/search/ExploreSearchResults.test.ts`
  - Add pure tests for errored sections if a helper is extracted; otherwise keep integration assertions in the screen suite.
- Modify `app/components/Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen.view.test.tsx`
  - Add component-view coverage for the Earn pill, All cap, full Earn list, initial routing, empty/error states, View all, and existing-feed preservation.
- Modify `app/components/UI/Earn/components/EarnSection/EarnSection.tsx`
  - Replace both placeholder alerts with navigation to `ExploreSearch` and `{ initialPill: 'earn' }`.
- Modify `app/components/UI/Earn/components/EarnSection/EarnSection.test.tsx`
  - Assert both existing Earn card actions navigate to the preselected Earn search.

### Navigation and analytics types

- Existing `app/core/NavigationService/types.ts` already imports `ExploreSearchRouteParams` and registers `ExploreSearch`; no change is required unless TypeScript diagnostics show a route-param mismatch.
- Existing `app/components/Views/TrendingView/search/analytics.ts` derives `tab_name`, `section_name`, item IDs, and counts from `SearchFeedId`; adding `earn` to the union should make Earn analytics type-safe without a new event schema.
- Existing `locales/languages/en.json` already contains the required Earn copy (`money_account`, `get_started`, APY/APR, unavailable, error, retry); do not add duplicate keys.

---

### Task 1: Extract the full Earn ranking projection

**Files:**

- Modify: `app/components/UI/Earn/utils/earnSection/rankEarnSectionAssets.ts`
- Modify: `app/components/UI/Earn/utils/earnSection/index.ts`
- Test: `app/components/UI/Earn/utils/earnSection/rankEarnSectionAssets.test.ts`
- Create: `app/components/UI/Earn/components/EarnAssetIcon/EarnAssetIcon.tsx`
- Create: `app/components/UI/Earn/utils/earnSection/getEarnAssetRateText.ts`
- Modify: `app/components/UI/Earn/components/EarnSection/EarnSection.tsx`

**Interfaces:**

- Produces `rankEarnAssets(assets: readonly EarnAsset[]): EarnSectionRankedAsset[]`.
- Preserves `rankEarnSectionAssets(assets, limit = 5): EarnSectionAssetSlot[]`.
- Produces `EarnAssetIcon({ token }: { token: TokenI }): JSX.Element`.
- Produces `getEarnAssetRateText({ asset, useGetCopy }: { asset: EarnSectionRankedAsset; useGetCopy: boolean }): string`.

- [ ] **Step 1: Write the failing projection tests**

Add a full-list test using the existing `createAsset` and `createHeldAsset` fixtures:

```ts
it('returns every enriched asset without padding', () => {
  const result = rankEarnAssets([
    createAsset('USDT'),
    createHeldAsset('DAI', 10),
    createHeldAsset('USDC', 20),
  ]);

  expect(result).toHaveLength(3);
  expect(result.map((asset) => getEarnAssetMetadata(asset).symbol)).toEqual([
    'USDC',
    'DAI',
    'USDT',
  ]);
  expect(result.every((asset) => asset.rateStatus === 'ready')).toBe(true);
});
```

Add an assertion that the highest-rate experience keeps both its APR/APY type and percentage:

```ts
it('preserves the selected highest-rate APR or APY experience', () => {
  const [result] = rankEarnAssets([
    createAsset('ETH', [
      {
        id: 'pooled:eth',
        type: EARN_EXPERIENCES.POOLED_STAKING,
        role: 'underlying',
        rate: { type: 'APR', percentage: 4.1, status: 'ready' },
        isFeeSubsidized: false,
      },
      {
        id: 'lending:eth',
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        role: 'underlying',
        rate: { type: 'APY', percentage: 3.9, status: 'ready' },
        isFeeSubsidized: false,
      },
    ]),
  ]);

  expect(result.highestRatePercent).toBe(4.1);
  expect(result.highestRateExperience?.rate.type).toBe('APR');
});
```

- [ ] **Step 2: Run the projection tests and verify they fail**

Run:

```bash
yarn jest app/components/UI/Earn/utils/earnSection/rankEarnSectionAssets.test.ts --runInBand --coverage=false
```

Expected: FAIL because `rankEarnAssets` is not exported yet.

- [ ] **Step 3: Implement the smallest full-list projection**

Move the existing enrichment and held/discovery sorting into `rankEarnAssets`, then make the fixed-card function only adapt it:

```ts
export const rankEarnAssets = (
  assets: readonly EarnAsset[],
): EarnSectionRankedAsset[] => {
  const rankedAssets = assets.map(
    (asset): EarnSectionRankedAsset => ({
      ...asset,
      highestRatePercent: getHighestRatePercent(asset.experiences),
      highestRateExperience: getHighestRateExperience(asset.experiences),
      rateStatus: getRateStatus(asset.experiences),
    }),
  );

  const held = rankedAssets
    .filter(hasEarnAssetBalance)
    .sort(
      (first, second) =>
        compareKnownNumbersDescending(
          getEarnAssetFiatNumber(first),
          getEarnAssetFiatNumber(second),
        ) || compareByKey(first, second),
    );

  const unheld = rankedAssets
    .filter((asset) => !hasEarnAssetBalance(asset))
    .sort(
      (first, second) =>
        compareKnownNumbersDescending(
          first.highestRatePercent,
          second.highestRatePercent,
        ) || compareByKey(first, second),
    );

  return [...held, ...unheld];
};

export const rankEarnSectionAssets = (
  assets: readonly EarnAsset[],
  limit = EARN_SECTION_ASSET_LIMIT,
): EarnSectionAssetSlot[] => {
  const slots = rankEarnAssets(assets)
    .slice(0, limit)
    .map((asset) => ({ kind: 'asset' as const, key: asset.assetId, asset }));

  while (slots.length < limit) {
    slots.push({
      kind: 'unavailable',
      key: `earn-section-unavailable-${slots.length}`,
    });
  }

  return slots;
};
```

Export `rankEarnAssets` from `utils/earnSection/index.ts`. Keep `EARN_SECTION_ASSET_LIMIT = 5`, unavailable slot keys, held-first ordering, fiat ordering, rate ordering, and no APR/APY normalization unchanged.

- [ ] **Step 4: Extract only shared icon/rate presentation**

Move the existing `renderEarnAssetIcon` JSX into `EarnAssetIcon`. It must preserve `BadgeWrapperPosition.BottomRight`, `BadgeNetwork`, `getNetworkImageSource`, and `AssetLogo`.

Move rate-key selection into `getEarnAssetRateText`. The helper must:

```ts
if (asset.highestRatePercent === undefined) {
  return strings('earn_module.rate_unavailable');
}

const isApr = asset.highestRateExperience?.rate.type === 'APR';
const key = useGetCopy
  ? isApr
    ? 'earn_module.get_rate_apr'
    : 'earn_module.get_rate_apy'
  : isApr
    ? 'earn_module.rate_apr'
    : 'earn_module.rate_apy';

return strings(key, {
  percentage: truncateNumber(asset.highestRatePercent),
});
```

Update `EarnSection.tsx` to use `EarnAssetIcon` and pass its current `hasMinDepositAmount` value as `useGetCopy`. This preserves the homepage's existing minimum-deposit behavior; search rows will independently pass the raw-balance-held decision required by MUSD-1259.

- [ ] **Step 5: Run focused tests and inspect diagnostics**

Run:

```bash
yarn jest app/components/UI/Earn/utils/earnSection/rankEarnSectionAssets.test.ts app/components/UI/Earn/components/EarnSection/EarnSection.test.tsx --runInBand --coverage=false
```

Run lints for changed source/tests. Expected: all focused tests pass, no unused imports, and no TypeScript/ESLint diagnostics.

**Approval gate:** Stop here and ask for human validation before Task 2. Do not commit.

### Task 2: Build the single Earn search feed

**Files:**

- Create: `app/components/Views/TrendingView/feeds/earn/earnSearchTypes.ts`
- Create: `app/components/Views/TrendingView/feeds/earn/useEarnSearchFeed.ts`
- Test: `app/components/Views/TrendingView/feeds/earn/useEarnSearchFeed.test.ts`

**Interfaces:**

- Consumes `useEarnAssetCatalogue()`, `rankEarnAssets`, `useMoneyAccountVisibility`, and `useMoneyAccountBalance`.
- Produces `EarnSearchItem[]` in pinned-Money-then-ranked-asset order.
- Produces `isLoading`, `error`, `retry`, and `isRetrying` for the search boundary.

- [ ] **Step 1: Define discriminated item and error types**

Create:

```ts
export interface EarnMoneyAccountSearchItem {
  kind: 'money-account';
  id: 'money-account';
  balanceRaw?: string;
  balanceFiat?: string;
  isBalanceLoading: boolean;
  apyPercent?: number;
  rateStatus: EarnRateStatus;
}

export interface EarnAssetSearchItem {
  kind: 'asset';
  id: EarnAssetId;
  asset: EarnSectionRankedAsset;
}

export type EarnSearchItem = EarnMoneyAccountSearchItem | EarnAssetSearchItem;

export interface EarnSearchFeedError {
  message: string;
  retry: () => Promise<void>;
  isRetrying: boolean;
}

export interface EarnSearchFeedResult {
  data: EarnSearchItem[];
  isLoading: boolean;
  error?: EarnSearchFeedError;
}
```

Use `EarnAssetId`/`assetId` as the asset identifier and the literal `money-account` as the Money identifier. Do not derive IDs from display names.

- [ ] **Step 2: Write failing hook tests with mocked authorities**

Mock `useEarnAssetCatalogue`, `useMoneyAccountVisibility`, `useMoneyAccountBalance`, and `useMoneyNavigation`. Use catalogue fixtures containing:

```ts
const createDiscoverySearchAsset = (
  name: string,
  overrides: Partial<EarnAssetMetadata> = {},
): EarnAsset => ({
  kind: 'discovery',
  assetId: `eip155:1/erc20:${name.toLowerCase()}` as EarnAssetId,
  metadata: {
    address: `0x${name.toLowerCase()}`,
    chainId: '0x1',
    decimals: 6,
    image: `${name}.png`,
    name,
    symbol: name,
    logo: `${name}.png`,
    isETH: false,
    ...overrides,
  },
  experiences: [readyApyExperience(name, 4)],
});

const createHeldSearchAsset = (symbol: string, balance: string): EarnAsset => ({
  ...createDiscoverySearchAsset(symbol),
  kind: 'held',
  asset: createAssetControllerAsset({ symbol, balance, rawBalance: '0x1' }),
});

const heldUsdc = createHeldSearchAsset('USDC', '25');
const discoveryUsdt = createDiscoverySearchAsset('USDT');
const discoveryDai = createDiscoverySearchAsset('DAI');
```

Define `readyApyExperience` and `createAssetControllerAsset` in the test file using the existing `EarnExperience` and `Asset` fixture shapes from `rankEarnSectionAssets.test.ts`; set `rawBalance` to `'0x0'` for zero-balance discovery fixtures and include fiat metadata for held fixtures. Do not call a real catalogue or network.

Add one assertion per behavior:

```ts
it('pins visible Money before all ranked assets', () => {
  mockMoneyVisible(true);
  mockCatalogue({ assets: [discoveryUsdt, heldUsdc, discoveryDai] });

  const { result } = renderHook(() => useEarnSearchFeed({ query: '' }));

  expect(result.current.data.map((item) => item.id)).toEqual([
    'money-account',
    heldUsdc.assetId,
    discoveryDai.assetId,
    discoveryUsdt.assetId,
  ]);
});

it('keeps Money for a nonmatching query and filters assets by name, ticker, or symbol', () => {
  mockMoneyVisible(true);
  mockCatalogue({
    assets: [
      createDiscoverySearchAsset('USD Coin', {
        symbol: 'USDC',
        ticker: 'USDC',
      }),
      createDiscoverySearchAsset('Dai Stablecoin', {
        symbol: 'DAI',
        ticker: 'DAI',
      }),
    ],
  });

  const { result, rerender } = renderHook(
    ({ query }: { query: string }) => useEarnSearchFeed({ query }),
    { initialProps: { query: 'usdc' } },
  );

  expect(result.current.data.map((item) => item.id)).toEqual([
    'money-account',
    expect.stringContaining('usdc'),
  ]);

  rerender({ query: 'no-match' });
  expect(result.current.data.map((item) => item.id)).toEqual(['money-account']);
});
```

Also test hidden Money, loading with usable Money/assets, loading with no usable data, catalogue error, retry awaiting `refresh`, and duplicate retry suppression. All catalogue refresh promises must be mocked.

- [ ] **Step 3: Run the new hook tests and verify they fail**

Run:

```bash
yarn jest app/components/Views/TrendingView/feeds/earn/useEarnSearchFeed.test.ts --runInBand --coverage=false
```

Expected: FAIL because the feed types and hook do not exist.

- [ ] **Step 4: Implement ranking, filtering, progressive loading, and retry**

Call `useEarnAssetCatalogue` once at the hook boundary. Enrich and order the full catalogue with `rankEarnAssets`, then filter each ranked asset case-insensitively across `metadata.name`, `metadata.symbol`, and `metadata.ticker`:

```ts
const normalizedQuery = query.trim().toLowerCase();
const rankedAssets = useMemo(() => rankEarnAssets(assets), [assets]);

const matchingAssets = useMemo(
  () =>
    rankedAssets.filter((asset) => {
      if (!normalizedQuery) return true;
      const metadata = getEarnAssetMetadata(asset);
      return [metadata.name, metadata.ticker, metadata.symbol].some((value) =>
        value?.toLowerCase().includes(normalizedQuery),
      );
    }),
  [normalizedQuery, rankedAssets],
);
```

Construct the Money item when `isMoneyAccountVisible` is true, regardless of query. Use `isLoading && data.length === 0` for the feed loading flag so an available Money row or asset row remains visible while a balance/APY/catalogue field is still loading. Expose the catalogue error as existing Earn warning copy (`earn_module.assets_unavailable`) and never convert an error into an empty success state.

Implement retry with a ref guard:

```ts
const retryInFlightRef = useRef(false);
const [isRetrying, setIsRetrying] = useState(false);

const retry = useCallback(async () => {
  if (retryInFlightRef.current) return;
  retryInFlightRef.current = true;
  setIsRetrying(true);
  try {
    await refresh();
  } catch (error: unknown) {
    Logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'EarnSearch: Failed to refresh Earn data',
    );
    throw error;
  } finally {
    retryInFlightRef.current = false;
    setIsRetrying(false);
  }
}, [refresh]);
```

Keep all item construction, filtering, and returned objects memoized. Do not call catalogue hooks from row components.

- [ ] **Step 5: Run hook tests and diagnostics**

Run the focused hook suite and lint/type diagnostics for the new files. Expected: tests pass; no unused imports, conditional hook calls, or unstable callback dependency warnings.

**Approval gate:** Stop here and ask for human validation before Task 3. Do not commit.

### Task 3: Add accessible Earn search rows and warning UI

**Files:**

- Create: `app/components/Views/TrendingView/feeds/earn/EarnMoneyAccountRow.tsx`
- Test: `app/components/Views/TrendingView/feeds/earn/EarnMoneyAccountRow.test.tsx`
- Create: `app/components/Views/TrendingView/feeds/earn/EarnAssetRow.tsx`
- Test: `app/components/Views/TrendingView/feeds/earn/EarnAssetRow.test.tsx`
- Create: `app/components/Views/TrendingView/search/SearchFeedError.tsx`

**Interfaces:**

- `EarnMoneyAccountRow({ item, onPress })` receives `EarnMoneyAccountSearchItem`.
- `EarnAssetRow({ item, onPress })` receives `EarnAssetSearchItem`.
- `SearchFeedError({ error, feedId })` receives the generic search error object and renders Retry.

- [ ] **Step 1: Write failing row tests**

Mock navigation and design-system asset primitives only in unit tests. Assert exact text and stable IDs:

```ts
it('renders Money balance and APY skeletons independently', () => {
  const item = {
    kind: 'money-account',
    id: 'money-account',
    balanceRaw: '0',
    isBalanceLoading: true,
    rateStatus: 'loading',
  } satisfies EarnMoneyAccountSearchItem;

  const { getByTestId, queryByText } = render(
    <EarnMoneyAccountRow item={item} onPress={jest.fn()} />,
  );

  expect(getByTestId('earn-search-money-balance-skeleton')).toBeOnTheScreen();
  expect(getByTestId('earn-search-money-apy-skeleton')).toBeOnTheScreen();
  expect(queryByText(strings('earn_module.get_started'))).toBeNull();
});
```

Add tests for zero balance/New/Get started, nonzero fiat balance, unavailable APY, held `Get ... APY/APR`, discovery `... APY/APR`, token amount/symbol, network badge, and `onPress`.

Navigation assertions must distinguish raw token balance:

```ts
it('opens strategy selection for any positive token balance', () => {
  const asset = createHeldSearchAsset('USDC', '0.001');
  const item = {
    kind: 'asset',
    id: asset.assetId,
    asset: rankEarnAssets([asset])[0],
  } satisfies EarnAssetSearchItem;
  const onPress = jest.fn();

  const { getByTestId } = render(
    <EarnAssetRow item={item} onPress={onPress} />,
  );

  fireEvent.press(getByTestId('earn-search-asset-row'));
  expect(onPress).toHaveBeenCalledWith(item);
});
```

Define `createHeldSearchAsset` in this row test with the same `Asset` fixture shape used by the hook test, and use `rankEarnAssets([asset])[0]` so the row receives the exact enriched asset type.

The parent `SearchFeedRow` will own the navigation callback; the row test only verifies the callback contract. Test the callback's navigation behavior in the integration task where `TokenDetailsSource.ExploreEarn` and route params are available.

- [ ] **Step 2: Implement Money row**

Use an accessible `ButtonBase`/pressable row with `accessibilityRole="button"` and `testID="earn-search-money-row"`. Render:

- `MoneyBalanceIcon` at 40 px.
- `EarnNewTag` only when `balanceRaw === '0'`.
- `earn_module.money_account`.
- A balance skeleton while `isBalanceLoading`; otherwise `earn_module.get_started` for raw zero, formatted fiat for a nonzero raw balance, or `earn_module.balance_unavailable` when no formatted value exists.
- An APY skeleton only while `rateStatus === 'loading'`; otherwise `earn_module.rate_unavailable` for missing APY or `earn_module.rate_apy` with `truncateNumber`.

Keep balance and APY branches independent. Wrap decorative children with `accessible={false}` so the row remains one accessible button. Use `useCallback` in the parent for `navigateToMoneyHome`.

- [ ] **Step 3: Implement asset row**

Use `EarnAssetIcon` with `earnAssetToToken(asset)`, then render metadata name, `${token.balance} ${metadata.symbol}`, and the shared rate helper. Use `hasEarnAssetBalance(asset)` to choose action copy and navigation; do not use the existing minimum-fiat-deposit helper because MUSD-1259 defines held as numeric token balance greater than zero.

The parent navigation callback must use:

```ts
if (hasEarnAssetBalance(asset)) {
  navigation.navigate(Routes.EARN.ROOT, {
    screen: Routes.EARN.STRATEGY_SELECTION,
    params: { assetId: asset.assetId },
  });
  return;
}

const token = earnAssetToToken(asset);
navigation.navigate('Asset', {
  ...token,
  source: TokenDetailsSource.ExploreEarn,
});
```

Preserve all existing token fields (`address`, `chainId`, `symbol`, `name`, `decimals`, `image`, `balance`, `isNative`, `isETH`, `aggregators`, and `rwaData`) when navigating to Asset Details. Keep callbacks stable with `useCallback`.

- [ ] **Step 4: Implement the shared feed warning**

Create `SearchFeedError` around the existing `BannerAlert` pattern:

```tsx
<BannerAlert
  severity={BannerAlertSeverity.Warning}
  description={error.message}
  actionButtonLabel={strings('earn_module.retry')}
  actionButtonOnPress={handleRetry}
  actionButtonProps={{
    isDisabled: error.isRetrying,
    isLoading: error.isRetrying,
    testID: `search-feed-${feedId}-error-retry`,
  }}
  testID={`search-feed-${feedId}-error`}
  accessibilityLabel={`${error.message}. ${strings('earn_module.retry')}`}
/>
```

`handleRetry` must await the supplied callback and preserve the warning after a repeated failure; do not replace it with empty rows or placeholder rates.

- [ ] **Step 5: Run row tests and diagnostics**

Run:

```bash
yarn jest app/components/Views/TrendingView/feeds/earn/EarnMoneyAccountRow.test.tsx app/components/Views/TrendingView/feeds/earn/EarnAssetRow.test.tsx --runInBand --coverage=false
```

Run lints/type diagnostics for every new row/error source and test file. Expected: exact copy assertions pass and no unused imports remain.

**Approval gate:** Stop here and ask for human validation before Task 4. Do not commit.

### Task 4: Integrate Earn into Explore Search and navigation

**Files:**

- Modify: `app/components/Views/TrendingView/search/useExploreSearch.ts`
- Modify: `app/components/Views/TrendingView/search/searchTypes.ts`
- Modify: `app/components/Views/TrendingView/search/SearchFeedRow.tsx`
- Modify: `app/components/Views/TrendingView/search/viewMoreLabel.ts`
- Modify: `app/components/Views/TrendingView/search/viewMoreLabel.test.ts`
- Modify: `app/components/Views/TrendingView/search/ExploreSearchResults.tsx`
- Modify: `app/components/Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen.tsx`
- Modify: `app/components/Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen.types.ts`
- Modify: `app/components/Views/TrendingView/search/useExploreSearch.test.ts`
- Modify: `app/components/Views/TrendingView/search/SearchFeedRow.test.tsx`
- Modify: `app/components/Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen.view.test.tsx`
- Modify: `app/components/UI/Earn/components/EarnSection/EarnSection.tsx`
- Modify: `app/components/UI/Earn/components/EarnSection/EarnSection.test.tsx`

**Interfaces:**

- `useExploreSearch` returns `SearchFeedSection[]` with `earn` after the optional Perps section.
- Earn sections carry `items`, `isLoading`, and an optional retryable error.
- `ExploreSearchScreen` accepts `initialPill?: string`; invalid/unavailable values resolve to `all`.
- Existing analytics functions receive `earn` through the extended `SearchFeedId` union.

- [ ] **Step 1: Add failing unit/integration assertions**

Extend `SearchFeedId` and test fixtures first. Add tests for:

```ts
expect(feedIds).toEqual([
  'tokens',
  'perps',
  'earn',
  'stocks',
  'predictions',
  'sites',
]);
```

With the flag disabled:

```ts
expect(feedIds).not.toContain('earn');
expect(feedIds).toEqual(['tokens', 'perps', 'stocks', 'predictions', 'sites']);
```

Add SearchFeedRow assertions that `getItemId('earn', moneyItem) === 'money-account'` and `getItemId('earn', assetItem) === assetItem.id`, and that a tap sends `section_name: 'earn'` on All and omits `section_name` on the Earn pill.

Add component-view cases for:

1. Earn pill appears after Perps only when the Explore Earn flag is enabled.
2. All shows Money plus two assets when Money is visible.
3. Earn shows Money plus every matching asset.
4. A nonmatching query still shows Money.
5. Hidden Money plus no matching assets uses the existing Earn empty state.
6. Earn errors render warning and Retry in All and Earn.
7. View all selects Earn.
8. `initialPill: 'earn'` selects Earn; disabled/invalid initial pill selects All.
9. Existing Crypto/Perps behavior remains unchanged.

Drive API-backed data through mocked catalogue/API authorities. Do not add `jest.mock` calls to the component-view test; use the existing renderer/state preset and network-level API mocks per `tests/component-view/AGENTS.md`.

- [ ] **Step 2: Run the new search assertions and verify failures**

Run unit suites:

```bash
yarn jest app/components/Views/TrendingView/search/useExploreSearch.test.ts app/components/Views/TrendingView/search/SearchFeedRow.test.tsx app/components/Views/TrendingView/search/viewMoreLabel.test.ts --runInBand --coverage=false
```

Run the component-view suite with its required config:

```bash
yarn jest -c jest.config.view.js app/components/Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen.view.test.tsx --runInBand --silent --coverage=false
```

Expected: failures identify the missing Earn feed, initial-pill behavior, and navigation wiring.

- [ ] **Step 3: Extend the feed model and register Earn**

Add:

```ts
export type SearchFeedId =
  | 'tokens'
  | 'perps'
  | 'earn'
  | 'stocks'
  | 'predictions'
  | 'sites';

export interface SearchFeedError {
  message: string;
  retry: () => Promise<void>;
  isRetrying: boolean;
}

export interface SearchFeedSection<T = unknown> {
  feedId: SearchFeedId;
  title: string;
  items: T[];
  isLoading: boolean;
  error?: SearchFeedError;
  fetchMore?: () => void;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  total?: number;
}
```

In `searchTypes.ts`, import `SearchFeedError` as a type from `useExploreSearch.ts`, then add the error row to the existing flat-list union:

```ts
export interface ListItemError {
  type: 'error';
  feedId: SearchFeedId;
  error: SearchFeedError;
}

export type FlatListItem =
  | ListItemHeader
  | ListItemData
  | ListItemSkeleton
  | ListItemError;
```

Map the feed-specific error into the generic search error:

```ts
const earnError: SearchFeedError | undefined = earn.error
  ? {
      message: earn.error.message,
      retry: earn.error.retry,
      isRetrying: earn.error.isRetrying,
    }
  : undefined;
```

Call `useEarnSearchFeed({ query: debouncedQuery })` once alongside the other feed hooks. Push the Earn section immediately after the Perps conditional and before Stocks:

```ts
if (isExploreEarnEnabled) {
  sections.push({
    feedId: 'earn',
    title: strings('homepage.sections.earn'),
    items: earn.data,
    isLoading: isDebouncing || earn.isLoading,
    error: earnError,
    total: earn.data.length,
  });
}
```

The flag controls registration/content. Do not reorder or alter existing sections. Keep `useExploreSearch` as the one shared instance for pills and active content so switching pills does not duplicate requests.

- [ ] **Step 4: Render Earn rows, skeletons, View all, and errors**

Update `SearchFeedRow`:

```tsx
case 'earn': {
  const earnItem = item as EarnSearchItem;
  return earnItem.kind === 'money-account' ? (
    <EarnMoneyAccountRow
      item={earnItem}
      onPress={() => navigateForEarnItem(earnItem)}
    />
  ) : (
    <EarnAssetRow
      item={earnItem}
      onPress={() => navigateForEarnItem(earnItem)}
    />
  );
}
```

Define `navigateForEarnItem` in `SearchFeedRow` with `useCallback`. It must call `navigateToMoneyHome()` for `money-account`, navigate held assets to `Routes.EARN.ROOT`/`Routes.EARN.STRATEGY_SELECTION`, and navigate zero-balance assets to `Asset` with `TokenDetailsSource.ExploreEarn`. Keep the existing outer `TapView` responsible for search analytics.

Use `item.id` for Earn analytics/key extraction. Keep `SearchFeedSkeleton` stable; use a dedicated Earn skeleton if the row geometry differs from the generic token skeleton.

Add `'earn'` to `LOCAL_SEARCH_FEEDS` so loaded Earn rows use exact count-based View X more behavior. Keep no-query behavior as View all. Add an error list item in `FlatListItem`, include errored sections even with zero rows, and render `SearchFeedError` after the section header. In `FullFeedList`, render the same warning above the full list and make `showFeedList` true when the active section has an error.

- [ ] **Step 5: Apply and consume the initial pill once**

Change route params to:

```ts
export interface ExploreSearchRouteParams {
  initialQuery?: string;
  initialPill?: string;
}
```

Pass `route.params?.initialPill` into `ExploreSearchContent`. Apply it once after sections exist:

```ts
const initialPillAppliedRef = useRef(false);

useEffect(() => {
  if (initialPillAppliedRef.current || sections.length === 0) return;

  const requestedPill = initialPill as ActivePill | undefined;
  const isAvailable =
    requestedPill === ALL_PILL_KEY ||
    sections.some((section) => section.feedId === requestedPill);

  setActivePill(isAvailable ? (requestedPill ?? ALL_PILL_KEY) : ALL_PILL_KEY);
  initialPillAppliedRef.current = true;
}, [initialPill, sections]);
```

Do not emit a user `tab_switched` event for route initialization. After the ref is set, pill changes remain user-controlled. If the Earn feed is feature-flagged off or the value is invalid, use All.

- [ ] **Step 6: Wire both existing Earn card actions**

Replace both placeholder `alert` handlers in `EarnSection.tsx` with stable callbacks:

```ts
const handleExploreEarnSearch = useCallback(() => {
  navigation.navigate(Routes.EXPLORE_SEARCH, { initialPill: 'earn' });
}, [navigation]);
```

Use it for the section header and View more card. Keep existing asset navigation, Money navigation, telemetry, and `TokenDetailsSource` behavior unchanged.

- [ ] **Step 7: Verify focused search behavior**

Run all unit and component-view suites from Step 2. Run lints/type diagnostics for every changed file. Expected:

- Earn appears only when gated.
- Earn ordering is after Perps.
- All cap is three total Earn rows.
- Earn filter is unpadded and fully filtered.
- Money remains query-independent.
- Errors remain visible and Retry is awaitable/de-duplicated.
- View all and card actions select Earn.
- Invalid/disabled initial pills select All.
- Analytics IDs and tab/section names are typed and correct.
- Existing feed tests remain passing.

**Approval gate:** Stop here and ask for human validation before Task 5. Do not commit.

### Task 5: Final focused verification and handoff

**Files:**

- No new source files.
- Re-run all changed-file tests and diagnostics from Tasks 1–4.

- [ ] **Step 1: Run the complete focused Jest set**

Run:

```bash
yarn jest \
  app/components/UI/Earn/utils/earnSection/rankEarnSectionAssets.test.ts \
  app/components/UI/Earn/components/EarnSection/EarnSection.test.tsx \
  app/components/Views/TrendingView/feeds/earn/useEarnSearchFeed.test.ts \
  app/components/Views/TrendingView/feeds/earn/EarnMoneyAccountRow.test.tsx \
  app/components/Views/TrendingView/feeds/earn/EarnAssetRow.test.tsx \
  app/components/Views/TrendingView/search/useExploreSearch.test.ts \
  app/components/Views/TrendingView/search/SearchFeedRow.test.tsx \
  app/components/Views/TrendingView/search/viewMoreLabel.test.ts \
  --runInBand --coverage=false
```

Run the component-view suite separately:

```bash
yarn jest -c jest.config.view.js \
  app/components/Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen.view.test.tsx \
  --runInBand --silent --coverage=false
```

- [ ] **Step 2: Run changed-file lint and TypeScript diagnostics**

Run the repository's focused lint/type commands for all modified and created files. Confirm unused imports are removed and no new diagnostics remain. Do not treat pre-existing unrelated diagnostics as regressions; list them separately if encountered.

- [ ] **Step 3: Review against the spec**

Check every requirement in `docs/superpowers/specs/2026-08-20-musd-1259-earn-explore-search-design.md`:

- Feed is gated and inserted after Perps.
- Full ranking is shared; homepage remains five-slot/padded.
- Money is pinned and query-independent.
- All and Earn caps differ correctly.
- Held/discovery copy and navigation use raw token balance semantics.
- Loading is progressive; errors are visible; retry is awaited and de-duplicated.
- Analytics/accessibility/performance constraints hold.
- No new Earn requests occur from rows.
- No main Explore tab or Appium coverage was added.

- [ ] **Step 4: Report exact verification results and pause**

Report commands, pass/fail results, diagnostics, and any pre-existing failures. Do not commit or open a PR unless explicitly requested.

**Final approval gate:** Stop for human validation and wait for the user's next instruction.

## Self-Review

- **Spec coverage:** Tasks 1–5 cover every requirement, including projection boundaries, feed gating/order, pinned Money behavior, filtering, caps, loading/error handling, navigation, analytics/accessibility, performance, tests, and out-of-scope exclusions.
- **Placeholder scan:** No implementation step is left as TBD/TODO or “write tests for the above”; each code-bearing step includes concrete signatures, branches, or assertions.
- **Type consistency:** `EarnSearchItem.id` supplies SearchFeedRow analytics/key extraction; `SearchFeedError` supplies both All and full-feed warning renderers; `initialPill?: string` is validated against the runtime `SearchFeedId` sections before state selection.
- **User approval boundaries:** Each task ends at an explicit human checkpoint, and no implementation commit is authorized by this plan.
