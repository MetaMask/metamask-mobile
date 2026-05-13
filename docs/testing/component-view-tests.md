# Component View Tests

Guidance for component view tests (`*.view.test.tsx`) using the `tests/component-view/` framework.

Use this when you need to:

- Write a new component view test file
- Update tests after a component or preset has changed
- Diagnose and fix a failing component view test

## What Are Component View Tests?

Component view tests are **integration-level** tests that test views through real Redux state — no mocked hooks or selectors. They live alongside the component as `ComponentName.view.test.tsx` and use a dedicated framework in `tests/component-view/`.

Key constraint: **only Engine and allowed native modules may be mocked** (enforced at runtime by `app/util/test/testSetupView.js` and by ESLint override in `.eslintrc.js` for `**/*.view.test.*`).

## The Framework at a Glance

```
tests/component-view/
├── mocks.ts              ← Engine + native mocks (import this first, always)
├── render.tsx            ← renderComponentViewScreen, renderScreenWithRoutes
├── stateFixture.ts       ← StateFixtureBuilder (createStateFixture)
├── platform.ts           ← describeForPlatforms, itForPlatforms (run per iOS/Android)
├── api-mocking/          ← HTTP API mocks (nock) — extensible, one file per feature
├── presets/              ← initialState<Feature>() builders — one file per feature area
└── renderers/            ← render<Feature>View() functions — one file per feature area
```

## Workflow

- **Write new test**: Read component and existing tests → list use cases and map to test patterns → check coverage and deduplicate → use or create renderer/preset → write test (use `renderScreenWithRoutes` if asserting navigation). Every test must have at least one of: `fireEvent`, `waitFor`/`findBy`, `store.dispatch`/`act`, or Engine spy (no render-only scenarios). Run tests, then run the [Self-Review Checklist](#self-review-checklist).
- **Fix failing test**: Run with `jest.config.view.js` → identify error type from the [Diagnosing Failures](#diagnosing-failures) table → apply the fix (remove disallowed mock, add state override, add preset, wrap in `waitFor`, add `deterministicFiat`, etc.) → re-run.
- **Update after change**: Same as write — review existing tests, extend preset/renderer if needed, update tests, run and self-review.

## Run the Tests

Always use `jest.config.view.js` — the default Jest config does not apply component view test rules.

```bash
# Run a single file
yarn jest -c jest.config.view.js app/components/UI/Bridge/Views/BridgeView/BridgeView.view.test.tsx --runInBand --silent --coverage=false

# Run a specific test by name
yarn jest -c jest.config.view.js <file> -t "renders the source token" --runInBand --silent --coverage=false

# Watch mode
yarn jest -c jest.config.view.js <file> --watch

# Coverage for a feature folder (use this, not --coverage directly — avoids OOM)
yarn test:view:coverage:folder app/components/UI/MyFeature

# Lint check
yarn eslint <path/to/test.tsx>
```

## Golden Rules (Enforced)

1. **Only mock Engine and allowed native modules** — no arbitrary `jest.mock()` in `*.view.test.*` files. Allowed:
   - `../../app/core/Engine`
   - `../../app/core/Engine/Engine`
   - `react-native-device-info`
   - (these are already handled by `tests/component-view/mocks.ts`)

2. **Drive all behavior through Redux state** — no mocking of hooks or selectors. Provide data via state overrides.

3. **Reuse presets and renderers** — never rebuild the full state manually from scratch.

4. **No fake timers** — never use `jest.useFakeTimers()`, `jest.advanceTimersByTime()`, or `jest.useRealTimers()`.

5. **Test behavior, not snapshots** — use `toBeOnTheScreen()`, `not.toBeOnTheScreen()`, interaction assertions.

6. **Follow AAA** — Arrange → Act → Assert, blank lines between each section. One test = one user journey or business outcome; multiple chained actions in a single test are fine.

7. **No render scenarios** — every test must have at least one of: `fireEvent`, `waitFor`/`findBy`, `store.dispatch`/`act`, or an Engine spy. Static visibility checks are not tests. See [Writing Tests](#writing-tests) for examples.

8. **Use selector ID constants, never raw strings** — every `getByTestId` / `findByTestId` / `queryByTestId` must reference a constant from `ComponentName.testIds.ts`. Create the file if it does not exist.

9. **Every view with async data needs one data-completeness test** — wait for the load and validate all significant fields of all items in the base mock using `within()` per row. One per independent async data flow.

10. **Filter / segmentation tests must assert both sides** — after selecting a filter, assert both what appears (positive `findByTestId`) and what disappears (negative `queryByTestId(...).not.toBeOnTheScreen()`).

---

## Writing Tests

### Read Before Writing

Before writing any test, read:

- The component file under test
- Any existing `*.view.test.tsx` for the same component
- The relevant preset(s) in `tests/component-view/presets/`
- The relevant renderer(s) in `tests/component-view/renderers/`
- If the view calls an external HTTP API: `tests/component-view/api-mocking/` and any existing `api-mocking/<feature>.ts` for that API (see [External Service / API Mocking](#external-service--api-mocking))

### Enumerate Use Cases

**Do this before writing a single test line.** Build a candidate list scoped and deduplicated against existing tests.

#### 1. List user-facing actions

Ask: "What can a user **do** on this screen?" — type/paste input, press a button, select from a list, scroll/refresh, open/dismiss a modal, navigate to a sub-screen, wait for async data, long-press/swipe, toggle a setting.

#### 2. Map each action to a valid test pattern

| User action / system event                            | Valid pattern                                         |
| ----------------------------------------------------- | ----------------------------------------------------- |
| Presses button → UI changes                           | `fireEvent.press` → `waitFor`                         |
| Types input → value appears                           | `userEvent.type` or `fireEvent.changeText` → `findBy` |
| Selects item → navigates                              | `userEvent.press` → route probe                       |
| Redux action dispatched → Engine called               | `store.dispatch` + `act` → Engine spy                 |
| Async data arrives → list renders                     | `findBy` / `waitFor`                                  |
| User triggers action → API called with correct params | interaction → spy assertion                           |
| Chained user journey → end state visible              | Multiple `fireEvent` → final `findBy`                 |

Drop anything that only produces a render scenario: "The screen shows X when state is Y", "Button is disabled without input", "Token name appears in header".

#### 3. Deduplicate against existing tests

Read `ComponentName.view.test.tsx` (if it exists) and remove any candidate already covered.

#### 4. Run coverage and prioritize

```bash
yarn test:view:coverage:folder app/components/UI/MyFeature
```

Focus on low branch coverage. Prioritize candidates that cover the most uncovered paths. Proceed directly to writing.

### Write a New Test File

#### File naming

```
ComponentName.view.test.tsx   ← always *.view.test.tsx
```

#### What makes a good test

A good test is driven by **user interaction or a meaningful business condition** — not by what is statically visible after render. If your test has no `fireEvent`, no `act`, no `waitFor`, and no Engine spy, ask yourself: am I just checking the initial render? If yes, it's a render scenario and it's an antipattern.

Antipattern examples are in [What NOT to Do](#what-not-to-do). **Good tests are interaction-driven or verify a meaningful business rule:**

```typescript
// ✅ User types on keypad → fiat value reacts in real time
it('types 9.5 with keypad and displays $19,000.00 fiat value', async () => {
  const { getByTestId, getByText, findByText, findByDisplayValue } =
    defaultBridgeWithTokens({
      bridge: {
        sourceAmount: '0',
        sourceToken: ETH_SOURCE,
        destToken: undefined,
      },
    });

  await waitFor(() =>
    expect(
      getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
    ).toBeOnTheScreen(),
  );

  fireEvent.press(getByText('9'));
  fireEvent.press(getByText('.'));
  fireEvent.press(getByText('5'));

  expect(await findByDisplayValue('9.5')).toBeOnTheScreen();
  expect(await findByText('$19,000.00')).toBeOnTheScreen();
});

// ✅ Redux dispatch → Engine called with correct params (proves the wiring, not just the UI)
it('calls quote API with custom slippage when user has set 5% and quote is requested', async () => {
  const updateQuoteSpy = jest.spyOn(
    Engine.context.BridgeController,
    'updateBridgeQuoteRequestParams',
  );
  const { store } = defaultBridgeWithTokens({
    bridge: { selectedDestChainId: '0x1' },
  });
  updateQuoteSpy.mockClear();

  act(() => {
    store.dispatch(setSlippage('5'));
  });

  await waitFor(
    () => {
      expect(updateQuoteSpy).toHaveBeenCalledWith(
        expect.objectContaining({ slippage: 5 }),
        expect.anything(),
      );
    },
    { timeout: 1000 },
  );

  updateQuoteSpy.mockRestore();
});

// ✅ Async data completeness — waits for API mock to resolve, then validates every
// field of every item. Valid because data arrival is async (findBy / waitFor).
// One of these per view — proves the full data pipeline end-to-end.
it('user sees all items with complete data after async load', async () => {
  const { findByText, findByTestId } = renderMyFeatureWithRoutes();

  // Wait for the first item to confirm data has loaded
  await waitFor(async () => {
    expect(await findByText('Token A')).toBeOnTheScreen();
  });

  // Validate all fields of each item in the base mock dataset
  const tokenARow = await findByTestId('token-row-item-eip155:1/erc20:0xAAA');
  const tokenAScope = within(tokenARow);
  expect(tokenAScope.getByText('Token A')).toBeOnTheScreen();
  expect(tokenAScope.getByText(/\+5\.2/)).toBeOnTheScreen(); // % change
  expect(tokenAScope.getByText(/\$/)).toBeOnTheScreen(); // price

  const tokenBRow = await findByTestId('token-row-item-eip155:1/erc20:0xBBB');
  const tokenBScope = within(tokenBRow);
  expect(tokenBScope.getByText('Token B')).toBeOnTheScreen();
  expect(tokenBScope.getByText(/-1\.8/)).toBeOnTheScreen();
  expect(tokenBScope.getByText(/\$/)).toBeOnTheScreen();
});

// ✅ User navigates to a new screen — proves the navigation wiring end-to-end.
// When you only need to confirm navigation occurred (not render the destination screen),
// omit the Component key. The framework renders a probe element with
// testID=`route-${routeName}` automatically when navigation arrives at that route.
it('navigates to dest token selector on press', async () => {
  const state = initialStateBridge()
    .withOverrides({ bridge: { sourceToken: ETH_SOURCE } })
    .build();
  const { findByTestId, findByText } = renderScreenWithRoutes(
    BridgeView as unknown as React.ComponentType,
    { name: Routes.BRIDGE.ROOT },
    [{ name: Routes.BRIDGE.TOKEN_SELECTOR }],
    { state },
  );

  fireEvent.press(await findByText('Swap to'));

  await findByTestId(`route-${Routes.BRIDGE.TOKEN_SELECTOR}`);
});
```

#### Local helper pattern

For test files where most tests share a common baseline, extract a local helper instead of repeating the same overrides:

```typescript
// Define the baseline once — each test only overrides its delta from here
const DEFAULT_BRIDGE = {
  sourceToken: ETH_SOURCE,
  destToken: USDC_DEST,
  sourceAmount: '1',
};

const defaultBridgeWithTokens = (overrides?: Record<string, unknown>) => {
  const { bridge: bridgeOverrides, ...rest } = overrides ?? {};
  return renderBridgeView({
    deterministicFiat: true,
    overrides: {
      bridge: {
        ...DEFAULT_BRIDGE,
        ...(bridgeOverrides as Record<string, unknown>),
      },
      ...rest,
    } as unknown as DeepPartial<RootState>,
  });
};
```

Then each test only specifies its delta from this baseline.

#### describe / it and platform (iOS + Android)

Import from `tests/component-view/platform`. All helpers accept an optional **filter** (3rd arg): `'ios'` | `'android'` | `['ios','android']` | `{ only: 'ios' }` | `{ skip: ['android'] }`. Env: `TEST_OS=ios` or `TEST_OS=android` to run only one OS.

| Helper                                                                  | Use                                                                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `describeForPlatforms(name, define, filter?)`                           | One describe per OS. Inside, `define({ os })`; use `it()` or `itForPlatforms()` — each runs once per that OS. |
| `itForPlatforms(name, (ctx) => {}, filter?)`                            | One `it` per OS. Callback receives `{ os }`.                                                                  |
| `itOnlyForPlatforms(name, fn, filter?)`                                 | Same as `itForPlatforms` but registers `it.only`.                                                             |
| `itEach(table)(name, (row) => {}, filter?)`                             | One `it` per table row × per OS. Use `$key` in name to interpolate row fields.                                |
| `describeEach(table)(name, (row) => { it('...', () => {}); }, filter?)` | One describe per row × per OS. Use `$key` in name.                                                            |
| `getTargetPlatforms(filter?)`                                           | Returns `['ios','android']` (or filtered list) for custom loops.                                              |

Example — `itEach` (each case runs on iOS and Android):

```typescript
import { itEach } from '../../../../../../tests/component-view/platform';

const cases = [
  { name: 'renders empty', amount: '0' },
  { name: 'displays fiat', amount: '1' },
];
itEach(cases)('$name', ({ amount }) => {
  const { findByDisplayValue } = renderDefault({
    bridge: { sourceAmount: amount },
  });
  expect(findByDisplayValue(amount)).toBeOnTheScreen();
});
```

Jest modifiers (`it.only`, `it.skip`, `describe.only`, `describe.skip`) work as usual inside these blocks.

#### Minimal template

```typescript
import '../../../../../../tests/component-view/mocks';
import { renderMyFeatureView } from '../../../../../../tests/component-view/renderers/myFeature';
import {
  describeForPlatforms,
  itForPlatforms,
} from '../../../util/test/platform';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { MyViewSelectorsIDs } from './MyView.testIds'; // ← always import from the component's testIds file
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';

// Local helper — encapsulates the common baseline, each test only overrides its delta
const DEFAULT_MY_FEATURE = {
  sourceToken: ETH_SOURCE,
  destToken: USDC_DEST,
  sourceAmount: '1',
};

const renderDefault = (overrides?: Record<string, unknown>) => {
  const { myFeature: featureOverrides, ...rest } = overrides ?? {};
  return renderMyFeatureView({
    deterministicFiat: true,
    overrides: {
      myFeature: {
        ...DEFAULT_MY_FEATURE,
        ...(featureOverrides as Record<string, unknown>),
      },
      ...rest,
    } as unknown as DeepPartial<RootState>,
  });
};

describeForPlatforms('MyView', () => {
  // ✅ User interaction → UI reacts
  it('types an amount with the keypad and updates the fiat display', async () => {
    const { getByTestId, getByText, findByDisplayValue, findByText } =
      renderDefault({
        bridge: {
          sourceAmount: '0',
          sourceToken: ETH_SOURCE,
          destToken: USDC_DEST,
        },
      });

    await waitFor(() =>
      expect(
        getByTestId(MyViewSelectorsIDs.KEYPAD_DELETE_BUTTON),
      ).toBeOnTheScreen(),
    );

    fireEvent.press(getByText('1'));
    fireEvent.press(getByText('0'));

    expect(await findByDisplayValue('10')).toBeOnTheScreen();
    expect(await findByText('$20,000.00')).toBeOnTheScreen();
  });

  // ✅ Redux dispatch → Engine method called with correct params
  it('calls updateBridgeQuoteRequestParams with the selected dest chain when chain changes', async () => {
    const updateQuoteSpy = jest.spyOn(
      Engine.context.BridgeController,
      'updateBridgeQuoteRequestParams',
    );
    const { store } = renderDefault({
      bridge: { sourceToken: ETH_SOURCE, sourceAmount: '1' },
    });
    updateQuoteSpy.mockClear();

    act(() => {
      store.dispatch(setDestChain('0xa'));
    });

    await waitFor(() => {
      expect(updateQuoteSpy).toHaveBeenCalledWith(
        expect.objectContaining({ destChainId: '0xa' }),
        expect.anything(),
      );
    });

    updateQuoteSpy.mockRestore();
  });

  // ✅ User press → navigates to a new screen
  it('opens the destination token selector when the dest token area is tapped', async () => {
    const state = initialStateMyFeature()
      .withOverrides({ bridge: { sourceToken: ETH_SOURCE } })
      .build();
    const { findByText, findByTestId } = renderScreenWithRoutes(
      MyView as unknown as React.ComponentType,
      { name: Routes.MY_FEATURE },
      [{ name: Routes.MY_FEATURE_TOKEN_SELECTOR }],
      { state },
    );

    fireEvent.press(await findByText('Swap to'));

    await findByTestId(`route-${Routes.MY_FEATURE_TOKEN_SELECTOR}`);
  });
});
```

#### Import order

`tests/component-view/mocks` **must be the very first import** — it installs Engine and native mocks before anything else loads. For remaining imports follow project ESLint rules: renderer → platform helpers → testIds constants → `@testing-library/react-native` → other.

### Choose the Right Renderer and Preset

#### Use an existing renderer when available

| View area      | Renderer                                                    | Preset                      |
| -------------- | ----------------------------------------------------------- | --------------------------- |
| Bridge         | `renderBridgeView`                                          | `initialStateBridge`        |
| Wallet         | `renderWalletView`                                          | `initialStateWallet`        |
| Trending       | `renderTrendingView`                                        | `initialStateTrending`      |
| Wallet Actions | `renderWalletActionsView`                                   | `initialStateWalletActions` |
| Perps          | `renderPerpsView`                                           | `initialStatePerps`         |
| Predict        | `renderPredictFeedView` / `renderPredictFeedViewWithRoutes` | `initialStatePredict`       |

#### Passing state overrides

Always start from a preset, then narrow down with minimal overrides:

```typescript
// Good — minimal delta from preset
renderBridgeView({
  deterministicFiat: true,
  overrides: {
    bridge: { sourceAmount: '1' },
  },
});

// Good — complex override via engine background state when needed
renderBridgeView({
  overrides: {
    engine: {
      backgroundState: {
        BridgeController: {
          state: { quotesLastFetched: 0 },
        },
      },
    },
  },
});
```

#### Bridge: enabling the confirm CTA

To enable the Bridge confirm CTA (requires a valid quote), use the `withBridgeRecommendedQuoteEvmSimple` helper on the state fixture — it's the easiest path:

```typescript
const state = initialStateBridge()
  .withBridgeRecommendedQuoteEvmSimple({ sourceAmount: '1' })
  .build();
```

Alternatively, set these fields manually in `engine.backgroundState.BridgeController`:

- `quotes: [recommendedQuote]`
- `recommendedQuote: recommendedQuote`
- `quotesLastFetched: Date.now()`
- `quotesLoadingStatus: 'SUCCEEDED'`

Also ensure remote feature flags enable Bridge for the target chain(s) via `RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2`.

#### When no renderer exists for the view yet

Create one. Pattern (copy from `tests/component-view/renderers/bridge.ts`):

```typescript
// tests/component-view/renderers/myFeature.ts
import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import MyView from '../../../app/components/Views/MyFeature';
import { initialStateMyFeature } from '../presets/myFeature';

interface RenderMyFeatureOptions {
  overrides?: DeepPartial<RootState>;
  deterministicFiat?: boolean;
}

export function renderMyFeatureView(
  options: RenderMyFeatureOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, deterministicFiat } = options;
  const builder = initialStateMyFeature({ deterministicFiat });
  if (overrides) builder.withOverrides(overrides);
  const state = builder.build();
  return renderComponentViewScreen(
    MyView as unknown as React.ComponentType,
    { name: Routes.MY_FEATURE },
    { state },
  );
}
```

#### When the view uses React Query (`@tanstack/react-query`)

If the view (or any child component) calls `useQuery` / `useMutation`, wrap the component in a `QueryClientProvider` inside the renderer — otherwise tests throw `No QueryClient set`:

```typescript
// tests/component-view/renderers/myFeature.tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderComponentViewScreen } from '../render';
import { initialStateMyFeature } from '../presets/myFeature';
import MyView from '../../../app/components/UI/MyFeature/MyView';
import Routes from '../../../app/constants/navigation/Routes';

export function renderMyFeatureView(options = {}) {
  const state = initialStateMyFeature(options).build();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return renderComponentViewScreen(
    () => (
      <QueryClientProvider client={queryClient}>
        <MyView />
      </QueryClientProvider>
    ),
    { name: Routes.MY_FEATURE },
    { state },
  );
}
```

Key points:

- Set `retry: false` so failed queries surface immediately in tests without retry delays
- Create a **new `QueryClient` per call** to avoid state leaking between tests

#### When the view reads route params (`initialParams`)

`renderComponentViewScreen` and `renderScreenWithRoutes` accept a 4th `initialParams` argument for views that read params from the route (e.g. via `useRoute().params`):

```typescript
// For a view that expects { marketId: string } as route params
renderComponentViewScreen(
  MyDetailView as unknown as React.ComponentType,
  { name: Routes.MY_FEATURE.DETAIL },
  { state },
  { marketId: 'market-abc-123' }, // ← initialParams as 4th argument
);
```

In tests using `renderScreenWithRoutes`, pass `initialParams` in the route object:

```typescript
renderScreenWithRoutes(
  MyDetailView as unknown as React.ComponentType,
  { name: Routes.MY_FEATURE.DETAIL, params: { marketId: 'market-abc-123' } },
  [],
  { state },
);
```

If the component crashes with `Cannot read properties of undefined (reading 'marketId')`, the view is reading a required route param — pass it via `initialParams` or `params`.

And the matching preset (`tests/component-view/presets/myFeature.ts`):

```typescript
import { createStateFixture } from '../stateFixture';

export const initialStateMyFeature = (options?: {
  deterministicFiat?: boolean;
}) => {
  const builder = createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalKeyringController()
    .withRemoteFeatureFlags({});

  if (options?.deterministicFiat) {
    builder.withOverrides({
      /* currency rate overrides */
    });
  }
  return builder;
};
```

---

## Navigation Testing

### How `renderScreenWithRoutes` works

`renderScreenWithRoutes(EntryComponent, entryRoute, routesArray, options)` — entry screen, its route name, an array of **1 to N** routes, and options (e.g. `{ state }`). Each route is `{ name: Routes.X }` or `{ name: Routes.X, Component: RealComponent }`.

When navigation hits a registered route, the framework renders an element with `` testID=`route-${routeName}` `` so you can assert with ``await findByTestId(`route-${Routes.X}`)``. If you passed `Component`, the real component is shown instead. Use only `{ name }` when you just need to assert navigation; use `Component` when the test interacts with the destination screen. For cross-screen journeys, use a renderer that registers all reachable routes with `Component`.

```typescript
// tests/component-view/renderers/myFeature.ts
export function renderMyFeatureWithRoutes(options = {}) {
  const state = initialStateMyFeature(options).build();

  return renderScreenWithRoutes(
    MyFeatureHome as unknown as React.ComponentType,
    { name: Routes.MY_FEATURE.HOME },
    [
      {
        name: Routes.MY_FEATURE.DETAIL,
        Component: MyFeatureDetail as unknown as React.ComponentType<unknown>,
      },
      {
        name: Routes.MY_FEATURE.FILTER_MODAL,
        Component: MyFeatureFilter as unknown as React.ComponentType<unknown>,
      },
      {
        name: Routes.MY_FEATURE.ASSET,
        Component: AssetDetails as unknown as React.ComponentType<unknown>,
      },
    ],
    { state },
  );
}
```

### Cross-screen journey test

The most valuable navigation tests follow a **complete user journey across multiple screens**:

```typescript
// ✅ User navigates from feed → full list view, then applies a network filter —
// the list updates with chain-specific data.
//
// Key techniques in this pattern:
//
// 1. DYNAMIC MOCK — the mock responds differently based on the params the component
//    passes. This proves the component sends the correct filter params to the API,
//    not just that the UI reacts to props.
//
// 2. PAIRED ASSERTIONS — after selecting the filter, assert BOTH sides:
//    - Positive: new items appear (the filtered set)
//    - Negative: old items are gone (queryByTestId(...).not.toBeOnTheScreen())
//    Asserting only one side does not prove the list actually changed.
it('displays only BNB tokens when BNB Chain network filter is selected', async () => {
  // Dynamic mock: returns different data based on the chainIds param
  getMyFeatureDataMock.mockImplementation(async (params) => {
    if (params?.chainIds?.length === 1 && params.chainIds[0] === 'eip155:56') {
      return mockBnbChainToken; // BNB-specific dataset
    }
    return mockTokensData; // default multi-chain dataset
  });

  const { findByTestId, findByText, getByTestId, queryByTestId } =
    renderMyFeatureWithRoutes();

  // Screen 1: wait for feed to load (confirms default data is visible)
  await waitFor(() =>
    expect(
      getByTestId(MyFeatureSelectorsIDs.FEED_SCROLL_VIEW),
    ).toBeOnTheScreen(),
  );

  // Navigate to full list view
  await userEvent.press(getByTestId('section-header-view-all'));
  await waitFor(() =>
    expect(getByTestId('full-list-header')).toBeOnTheScreen(),
  );

  // Confirm a non-BNB token is visible before filtering
  expect(
    await findByTestId('token-row-eip155:1/erc20:0xAAA...'),
  ).toBeOnTheScreen();

  // Open network filter modal and select BNB Chain
  await userEvent.press(getByTestId('all-networks-button'));
  await waitFor(() => expect(getByTestId('close-button')).toBeOnTheScreen());
  await userEvent.press(await findByText('BNB Chain'));

  // ✅ Positive assertions — BNB token appears with all its fields
  const bnbRow = await findByTestId('token-row-eip155:56/erc20:0xBTC000...');
  expect(within(bnbRow).getByText('Bitcoin BNB')).toBeOnTheScreen();
  expect(within(bnbRow).getByText(/\$44,500/)).toBeOnTheScreen();
  expect(within(bnbRow).getByText(/-1\.8/)).toBeOnTheScreen();

  // ✅ Negative assertions — previous chain tokens are gone (proves the list changed,
  // not just that new items were added on top)
  expect(
    queryByTestId('token-row-eip155:1/erc20:0xAAA...'),
  ).not.toBeOnTheScreen();
  expect(
    queryByTestId('token-row-eip155:1/erc20:0xBBB...'),
  ).not.toBeOnTheScreen();
  expect(
    queryByTestId('token-row-eip155:1/erc20:0xCCC...'),
  ).not.toBeOnTheScreen();
});
```

### `userEvent` vs `fireEvent`

For interactions that involve realistic user behavior (typing, pressing with focus), prefer `userEvent` over `fireEvent`:

```typescript
import { fireEvent, userEvent } from '@testing-library/react-native';

// ✅ userEvent — simulates full event sequence including focus, pointer events
await userEvent.press(getByTestId('button'));
await userEvent.type(getByTestId('search-input'), 'ethereum');

// fireEvent — lower-level, useful when userEvent isn't available or for non-user events
fireEvent.press(getByTestId('button'));
fireEvent.changeText(getByTestId('input'), 'value');
```

Route names live in `app/constants/navigation/Routes.ts`.

---

## External Service / API Mocking

Some views call **external HTTP APIs** (e.g. `fetch()` to a REST endpoint). Those requests cannot be driven through Redux state. The framework provides an **api-mocking** layer using [nock](https://github.com/nock/nock) so tests intercept HTTP at the network level **without** using `jest.mock` on service modules (which would violate the "only Engine and allowed native mocks" rule).

### Preferred pattern — nock (api-mocking folder)

All HTTP API mocks for component view tests live under `tests/component-view/api-mocking/`. Each feature has one file (e.g. `trending.ts`) that exports:

- Mock response data (e.g. `mockTrendingTokensData`)
- A **setup** function (e.g. `setupTrendingApiFetchMock(responseData?, customReply?)`) that uses nock to intercept the endpoint
- A **clear** function (e.g. `clearTrendingApiMocks()`) to call in `afterEach`

Shared nock lifecycle helpers (`clearAllNockMocks`, `disableNetConnect`, `teardownNock`) are in `api-mocking/nockHelpers.ts`. To **add a new API mock** for another view, add a file `api-mocking/<feature>.ts` following the pattern in `api-mocking/trending.ts` (mock data, `setupXxxApiMock`, `clearXxxApiMocks` using `nockHelpers`), and call setup/clear in the view test's `beforeEach`/`afterEach`.

**Example (trending):**

```typescript
import {
  setupTrendingApiFetchMock,
  clearTrendingApiMocks,
  mockTrendingTokensData,
  mockBnbChainToken,
} from '../../../../tests/component-view/api-mocking/trending';

beforeEach(() => {
  setupTrendingApiFetchMock(mockTrendingTokensData);
});
afterEach(() => {
  clearTrendingApiMocks();
});

it('user sees trending tokens section with mocked data', async () => {
  const { findByText, queryByTestId } = renderTrendingViewWithRoutes();
  await waitFor(async () => {
    expect(await findByText('Ethereum')).toBeOnTheScreen();
  });
  // assert rows with assertTrendingTokenRowsVisibility(...)
});

it('displays only BNB tokens when BNB Chain network filter is selected', async () => {
  setupTrendingApiFetchMock(mockTrendingTokensData, (uri) => {
    const url = new URL(uri, 'https://token.api.cx.metamask.io');
    const chainIdsParam = url.searchParams.get('chainIds') ?? '';
    const chainIds = chainIdsParam.split(',').map((s) => s.trim());
    if (chainIds.length === 1 && chainIds[0] === 'eip155:56') {
      return mockBnbChainToken;
    }
    return mockTrendingTokensData;
  });
  const { getByTestId, findByText, queryByTestId } =
    renderTrendingViewWithRoutes();
  // ... navigate to full view, open network filter, select BNB Chain
  // assert visible: [BNB], missing: [ETH, BTC, UNI]
});
```

### Fallback — jest.mock on the service module (antipattern)

When a view calls an external **function** (not `fetch`) from a package and that function cannot be replaced by nock (e.g. no HTTP), you may mock the module in a file under `tests/component-view/mocks/` and use setup/clear helpers. This requires an `eslint-disable` and is a **known antipattern**; prefer moving the integration to an HTTP API and using api-mocking, or drive data through Engine/Redux when possible.

> ⚠️ Only Engine and allowed native modules should be mocked in `*.view.test.*` files. Mocking a service module directly bypasses the ESLint guard. Always link to a tracking issue and plan to migrate to nock (api-mocking) or Engine/Redux.

---

## Deterministic Fiat Assertions

Pass `deterministicFiat: true` whenever a test asserts exact currency values. This injects stable exchange rates:

```typescript
const { getByText } = renderBridgeView({
  deterministicFiat: true,
  overrides: { bridge: { sourceAmount: '1' } },
});
expect(getByText('$2,000.00')).toBeOnTheScreen();
```

---

## Self-Review Checklist

Before declaring the task done, go through this checklist for every test written or modified. If any item fails, fix it and re-run.

| #   | Check                                                                                                                                                                                                                                                        | What to do if it fails                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| 1   | **No render scenarios** — every test has at least one `fireEvent`, `waitFor`/`findBy`, `store.dispatch`, or Engine spy                                                                                                                                       | Rewrite the test to add a user interaction or system reaction          |
| 2   | **No selector mocking** — no `(useSelector as jest.Mock).mockImplementation(...)` anywhere in the file                                                                                                                                                       | Remove; drive behavior through state overrides instead                 |
| 3   | **No fake timers** — no `jest.useFakeTimers()`, `jest.advanceTimersByTime()`, or `jest.useRealTimers()`                                                                                                                                                      | Remove fake timers; use `waitFor` / `findBy` for async flows           |
| 4   | **Data-completeness test exists** — if the view loads data asynchronously (API, Engine polling), there is one test that waits for the load and validates all fields of all items in the full base mock using `within()` per row                              | Add the data-completeness test                                         |
| 5   | **Filter/segmentation tests have paired assertions** — every test that selects a filter or changes a network asserts both what appears (`findByTestId`) AND what disappears (`queryByTestId(...).not.toBeOnTheScreen()`) for each item from the previous set | Add the missing negative assertions                                    |
| 6   | **No raw strings in `getByTestId` / `findByTestId` / `queryByTestId`** — all test IDs reference constants from the component's `ComponentName.testIds.ts`                                                                                                    | Create or update the testIds file; replace raw strings with constants  |
| 7   | **Any `jest.mock` for non-Engine modules is flagged** — if a service module is mocked directly, the `eslint-disable` comment is present and a tracking issue is linked                                                                                       | Add the comment and issue link                                         |
| 8   | **AAA formatting** — blank lines between the Arrange, Act, and Assert blocks in every test                                                                                                                                                                   | Add the blank line separators                                          |
| 9   | **Import order** — `mocks.ts` is first; remaining order follows project ESLint rules                                                                                                                                                                         | Ensure `mocks.ts` is the very first import; reorder the rest as needed |

---

## Diagnosing Failures

### Identify the error type first

| Error pattern                                    | Likely cause                                       | Fix                                                               |
| ------------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------- |
| `jest.mock is not allowed in *.view.test.*`      | Arbitrary `jest.mock` added to test                | Remove it; drive via state instead                                |
| `Unable to find an element with testID: xxx`     | State not providing needed data, or element hidden | Add the relevant state via overrides or check rendering condition |
| `Cannot read property 'X' of undefined`          | Preset missing a required state slice              | Add `.withMinimalXController()` or override in preset             |
| `Warning: An update was not wrapped in act(...)` | Async state update not awaited                     | Use `await waitFor(...)`                                          |
| `No QueryClient set`                             | Missing provider — not in Engine mock              | Add to mocks.ts or wrap with QueryClientProvider in renderer      |
| Flakey number assertions                         | Non-deterministic exchange rates                   | Add `deterministicFiat: true`                                     |
| Test passes locally, fails in CI                 | Time-sensitive assertions                          | Use `waitFor` not inline assertions after interactions            |

### Inspect what's rendered

```typescript
// Add temporarily inside the test
const { debug } = renderBridgeView();
debug(); // prints full component tree
```

### Check that state data reaches the component

Add a `console.log` in the component temporarily, or use `debug()` to confirm the Redux state is wired correctly before writing assertions.

### Check stale presets

When a controller's state shape changes (e.g. a new required field added to `BridgeController`), the preset becomes stale. Compare the component's actual selector usage against what the preset provides.

---

## Assertion Patterns

```typescript
// Presence / absence
expect(getByText('Label')).toBeOnTheScreen();
expect(queryByText('Label')).not.toBeOnTheScreen();

// Enabled / disabled state
expect(getByTestId('cta-button')).toBeEnabled();
expect(getByTestId('cta-button')).toBeDisabled();

// After interaction
fireEvent.press(getByTestId('some-button'));
await waitFor(() => expect(getByText('Result')).toBeOnTheScreen());

// Navigation assertion
await findByTestId(`route-${Routes.SOME_SCREEN}`);

// findByTestId 3rd-arg timeout (NOT 2nd arg)
await findByTestId('my-element', {}, { timeout: 3000 });

// Within a subtree — scope queries to avoid false positives when the same text or
// testID appears in multiple list items (e.g., every row shows a "price" label).
// Use within(rowElement) to constrain the query to a single row.
import { within } from '@testing-library/react-native';
const card = getByTestId(MyViewSelectorsIDs.TOKEN_CARD_ETH);
expect(within(card).getByText('ETH')).toBeOnTheScreen();
expect(within(card).getByText('$2,000.00')).toBeOnTheScreen();
```

---

## What NOT to Do

```typescript
// ❌ Render scenario — no interaction, no system reaction, just static visibility
it('renders input areas and hides confirm button without tokens or amount', () => {
  const { getByTestId, queryByTestId } = renderBridgeView({ overrides: { ... } });
  expect(getByTestId(SOURCE_AREA)).toBeOnTheScreen();     // render check
  expect(getByTestId(DEST_AREA)).toBeOnTheScreen();       // render check
  expect(queryByTestId(CONFIRM_BUTTON)).toBeNull();       // render check
});
// More assertions does NOT make it a better test if they're all static.
// ✅ Instead: drive the test through a user interaction, Redux action, or Engine spy

// ❌ Arbitrary mock — blocked by ESLint and runtime guard
jest.mock('../../some/hook', () => ({ useMyHook: jest.fn() }));

// ❌ Mocking a selector
(useSelector as jest.Mock).mockImplementation(...);

// ❌ Fake timers
jest.useFakeTimers();

// ❌ Snapshot assertion
expect(wrapper).toMatchSnapshot();

// ❌ Rebuilding the whole state from scratch
renderComponentViewScreen(MyView, { name: 'X' }, {
  state: { engine: { backgroundState: { /* 200 lines */ } } },
});
// ✅ Instead: use a preset + minimal overrides

// ❌ Raw string literal in getByTestId / findByTestId / queryByTestId
getByTestId('my-view-scroll-view');
queryByTestId('confirm-button');

// ✅ Use the constant from the component's testIds file
import { MyViewSelectorsIDs } from './MyView.testIds';
getByTestId(MyViewSelectorsIDs.SCROLL_VIEW);
queryByTestId(MyViewSelectorsIDs.CONFIRM_BUTTON);

// If the testIds file does not exist yet, create it first:
// export const MyViewSelectorsIDs = {
//   SCROLL_VIEW: 'my-view-scroll-view',
//   CONFIRM_BUTTON: 'my-view-confirm-button',
// } as const;
```

---

## Quick Reference

```bash
# Run component view tests
yarn jest -c jest.config.view.js <path> --runInBand --silent --coverage=false

# Coverage for a feature folder
yarn test:view:coverage:folder app/components/UI/MyFeature

# Lint check
yarn eslint <path/to/test.tsx>
```

**Key locations:**

| What                           | Where                                                   |
| ------------------------------ | ------------------------------------------------------- |
| Engine + native mocks          | `tests/component-view/mocks.ts`                         |
| render, renderScreenWithRoutes | `tests/component-view/render.tsx`                       |
| StateFixtureBuilder            | `tests/component-view/stateFixture.ts`                  |
| HTTP API mocks (nock)          | `tests/component-view/api-mocking/` (per-feature)       |
| Feature renderers (per view)   | `tests/component-view/renderers/` (e.g. bridge, wallet) |
| Feature presets (per view)     | `tests/component-view/presets/` (e.g. bridge, wallet)   |
| DeepPartial type               | `app/util/test/renderWithProvider`                      |
| Routes                         | `app/constants/navigation/Routes.ts`                    |
