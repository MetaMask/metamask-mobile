# Navigation & Mocking — Steps 3 & 4

Reference: [SKILL.md](../SKILL.md) · [Writing Tests](writing-tests.md) · [Reference](reference.md)

---

## Step 3: Navigation Testing

### How route probes work

When `renderScreenWithRoutes` registers a route, the framework automatically renders a probe element with `` testID=`route-${routeName}` `` when navigation arrives at that route. This is what makes ``findByTestId(`route-${Routes.X}`)`` work.

- **To assert navigation occurred**: register the route without a `Component` key. The probe element is rendered automatically — you only need ``findByTestId(`route-${routeName}`)``.
- **To test the destination screen itself** (cross-screen journeys): register the route with `Component: RealComponent`. The real component renders instead of the probe.
- **In renderers**: always register the real components so that cross-screen journey tests work. Probe-only routes are for one-off navigation assertions in individual tests.

### Single navigation push

When a test asserts that pressing something navigates to a new screen, use `renderScreenWithRoutes`. Register only the routes that test needs to assert on:

```typescript
import { renderScreenWithRoutes } from '../../../../../../../tests/component-view/render';
import { initialStateBridge } from '../../../../../../../tests/component-view/presets/bridge';
import Routes from '../../../../../../constants/navigation/Routes';

it('opens the destination token selector when the dest token area is tapped', async () => {
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

### Multi-screen renderer (for feature-level tests)

When a feature can navigate across several screens and you want to test those journeys end-to-end, the renderer itself should pre-register **all reachable routes** — not just the entry screen. This is the pattern used by `renderTrendingViewWithRoutes`:

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

Then tests can navigate across screens freely without registering routes per test.

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

## Step 4: External Service / API Mocking

Some views call external services **directly** (not through Engine controllers) — e.g. a `getTrendingTokens()` function imported from a package, or a `fetch()` call to an external API. These cannot be driven through Redux state overrides.

### Current pattern — jest.mock on the service module

When a view calls an external service function directly, mock the module in a dedicated file under `tests/component-view/mocks/` and expose setup/clear helpers:

```typescript
// tests/component-view/mocks/myFeatureApiMocks.ts
import { getMyFeatureData } from '@metamask/some-package';

export const getMyFeatureDataMock = getMyFeatureData as jest.Mock;

export const mockFeatureData = [
  { id: 'item-1', name: 'Token A', price: '100.00', change24h: 5.2 },
  { id: 'item-2', name: 'Token B', price: '200.00', change24h: -1.8 },
];

export const setupMyFeatureApiMock = (data = mockFeatureData) => {
  getMyFeatureDataMock.mockImplementation(async () => data);
};

export const clearMyFeatureApiMocks = () => {
  jest.clearAllMocks();
};
```

In the test file, declare the `jest.mock` at module scope and use `beforeEach`/`afterEach` for lifecycle:

```typescript
// NOTE: antipattern — only Engine and native modules should be mocked in view tests.
// This is a temporary workaround for service functions called directly from components,
// not through Engine. Track removal in the linked issue.
// eslint-disable-next-line no-restricted-syntax
jest.mock('@metamask/some-package', () => {
  const actual = jest.requireActual('@metamask/some-package');
  return { ...actual, getMyFeatureData: jest.fn().mockResolvedValue([]) };
});

import {
  setupMyFeatureApiMock,
  clearMyFeatureApiMocks,
  mockFeatureData,
  getMyFeatureDataMock,
} from '../../../../tests/component-view/mocks/myFeatureApiMocks';

describe('MyFeatureView', () => {
  beforeEach(() => {
    setupMyFeatureApiMock(mockFeatureData);
  });

  afterEach(() => {
    clearMyFeatureApiMocks();
  });

  it('shows token list after data loads from the external service', async () => {
    const { findByText } = renderMyFeatureWithRoutes();

    expect(await findByText('Token A')).toBeOnTheScreen();
  });

  it('shows only filtered results when a specific param is passed', async () => {
    getMyFeatureDataMock.mockImplementation(async (params) => {
      if (params?.chainId === 'eip155:56') return [mockBnbData];
      return mockFeatureData;
    });

    const { findByText } = renderMyFeatureWithRoutes();
    // ... interact to trigger the filter, then assert
  });
});
```

> ⚠️ **This is a known antipattern.** The golden rule is that only Engine and allowed native modules should be mocked in `*.view.test.*` files. Mocking a service module directly bypasses the ESLint guard (note the `eslint-disable` comment). Always link to a tracking issue and plan to migrate to a proper solution.

### Future pattern — Mock Service Worker (MSW)

> 📌 **Placeholder — no example exists yet in this codebase.**

For views that call HTTP endpoints directly (via `fetch`), the intended approach is [Mock Service Worker (msw)](https://mswjs.io/), which intercepts requests at the network level without needing `jest.mock`. This keeps tests closer to real behavior and avoids the module-mock antipattern.

When the first MSW-based view test is written, document the setup here:

```typescript
// TODO: Add MSW setup example once the first test using it is merged.
// Expected shape:
//
// import { setupServer } from 'msw/node';
// import { http, HttpResponse } from 'msw';
//
// const server = setupServer(
//   http.get('https://api.example.com/tokens', () =>
//     HttpResponse.json(mockTokensData),
//   ),
// );
//
// beforeAll(() => server.listen());
// afterEach(() => server.resetHandlers());
// afterAll(() => server.close());
```
