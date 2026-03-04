# Writing Tests — Steps 1 & 2

Reference: [Main skill](../component-view-test.md) · [Navigation & Mocking](navigation-mocking.md) · [Reference](reference.md)

---

## Step 1: Write a New Test File

### File naming

```
ComponentName.view.test.tsx   ← always *.view.test.tsx
```

### What makes a good test

A good test is driven by **user interaction or a meaningful business condition** — not by what is statically visible after render. If your test has no `fireEvent`, no `act`, no `waitFor`, and no Engine spy, ask yourself: am I just checking the initial render? If yes, it's a render scenario and it's an antipattern.

**Render scenarios are antipatterns — avoid all of these forms:**

```typescript
// ❌ Single condition, static assertion
it('disables the CTA when no source amount is set', () => {
  const { getByTestId } = renderBridgeView({ overrides: { bridge: { sourceAmount: '' } } });
  expect(getByTestId('cta-button')).toBeDisabled();
});

// ❌ Multiple static assertions — still just a render scenario, more assertions don't make it meaningful
it('renders input areas and hides confirm button without tokens or amount', () => {
  const { getByTestId, queryByTestId } = renderBridgeView({ overrides: { ... } });
  expect(getByTestId(SOURCE_AREA)).toBeOnTheScreen();
  expect(getByTestId(DEST_AREA)).toBeOnTheScreen();
  expect(queryByTestId(CONFIRM_BUTTON)).toBeNull();
});
```

**Good tests are interaction-driven or verify a meaningful business rule with a non-trivial state consequence:**

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

### Local helper pattern

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

### Minimal template

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
// Define the baseline before the helper
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

### Import order

**Hard requirement:** `tests/component-view/mocks` must be the very first import (side-effect import that installs the Engine and native module mocks before anything else loads).

For all remaining imports, follow the project's ESLint import ordering rules. The order is flexible — a typical arrangement is:

1. `tests/component-view/mocks` **(must be first)**
2. Renderer (e.g. `renderBridgeView`)
3. Platform helpers: `describeForPlatforms`, `itForPlatforms` from `app/util/test/platform`
4. Selector ID constants from `./ComponentName.testIds`
5. `@testing-library/react-native` utilities
6. Any other test-specific constants or type imports

---

## Step 2: Choose the Right Renderer and Preset

### Use an existing renderer when available

| View area      | Renderer                                                    | Preset                      |
| -------------- | ----------------------------------------------------------- | --------------------------- |
| Bridge         | `renderBridgeView`                                          | `initialStateBridge`        |
| Wallet         | `renderWalletView`                                          | `initialStateWallet`        |
| Trending       | `renderTrendingView`                                        | `initialStateTrending`      |
| Wallet Actions | `renderWalletActionsView`                                   | `initialStateWalletActions` |
| Perps          | `renderPerpsView`                                           | `initialStatePerps`         |
| Predict        | `renderPredictFeedView` / `renderPredictFeedViewWithRoutes` | `initialStatePredict`       |

### Passing state overrides

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

### When no renderer exists for the view yet

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

### When the view uses React Query (`@tanstack/react-query`)

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

### When the view reads route params (`initialParams`)

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

---

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
