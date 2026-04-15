# Navigation & Mocking

Reference: [SKILL.md](../SKILL.md) · [Writing Tests](writing-tests.md) · [Reference](reference.md)

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

Some views call **external HTTP APIs** (e.g. `fetch()` to a REST endpoint). Those requests cannot be driven through Redux state. The framework provides an **api-mocking** layer using [nock](https://github.com/nock/nock) so tests intercept HTTP at the network level **without** using `jest.mock` on service modules (which would violate the “only Engine and allowed native mocks” rule).

### Preferred pattern — nock (api-mocking folder)

All HTTP API mocks for component view tests live under `tests/component-view/api-mocking/`. Each feature has one file (e.g. `trending.ts`) that exports:

- Mock response data (e.g. `mockTrendingTokensData`)
- A **setup** function (e.g. `setupTrendingApiFetchMock(responseData?, customReply?)`) that uses nock to intercept the endpoint
- A **clear** function (e.g. `clearTrendingApiMocks()`) to call in `afterEach`

Shared nock lifecycle helpers (`clearAllNockMocks`, `disableNetConnect`, `teardownNock`) are in `api-mocking/nockHelpers.ts`. To **add a new API mock** for another view, add a file `api-mocking/<feature>.ts` following the pattern in `api-mocking/trending.ts` (mock data, `setupXxxApiMock`, `clearXxxApiMocks` using `nockHelpers`), and call setup/clear in the view test’s `beforeEach`/`afterEach`.

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
