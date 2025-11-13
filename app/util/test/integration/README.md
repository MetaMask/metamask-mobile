# Integration Test Framework

This folder contains a lightweight integration testing framework with the following goals:

- Only mock the Engine and native modules necessary for deterministic environments
- Build and control application state through a single, composable fixture
- Provide view-specific presets and render helpers for concise, declarative tests
- Avoid mocking hooks or selectors – the UI should consume Redux state naturally

## Principles

- Single Engine mock: `app/util/test/integration/mocks.ts`
  - Provides minimal controller APIs and stubs for background interactions (e.g., `NetworkController.getNetworkClientById`)
  - Deterministic native data (e.g., `react-native-device-info`)
- State-driven tests:
  - Use `createStateFixture` to construct a realistic Redux state
  - Override only what is specific to each scenario
  - Satisfy selectors by providing the data they expect in state
- No hook/selector mocking:
  - All data consumed by hooks/selectors must come from the state
- Developer ergonomics:
  - View presets in `presets/*` give a “ready-to-render” baseline per view
  - Render helpers in `renderers/*` remove boilerplate and centralize routing

## Layout

```
app/util/test/integration/
├─ mocks.ts                     # Engine + native mocks (single source of truth)
├─ render.ts                    # Base render helper for any screen
├─ stateFixture.ts              # State builder with chainable helpers
├─ presets/
│  ├─ bridge.ts                 # Bridge preset (baseline)
│  └─ wallet.ts                 # Wallet preset (baseline)
└─ renderers/
   ├─ bridge.ts                 # Render helper for BridgeView
   └─ wallet.ts                 # Render helper for Wallet view
```

## Usage

### 1) Import the Engine mock once per test file

```ts
import '../../util/test/integration/mocks';
```

This ensures only the Engine (and allowed native bits) are mocked globally.

### 2) Render a screen using a view-specific renderer

```ts
import { renderBridgeView } from '../../util/test/integration/renderers/bridge';

const { getByTestId } = renderBridgeView({
  deterministicFiat: true,
  overrides: {
    bridge: {
      sourceAmount: '1',
      // additional overrides...
    },
  },
});
```

- `deterministicFiat` injects rate controllers from the view mocks to make fiat outputs exact.
- `overrides` deep-merges on top of the preset baseline for that view.

### 3) Prefer presets over manual fixture setup

Under the hood, `renderBridgeView` uses the Bridge preset:

```ts
// presets/bridge.ts
export const initialStateBridge = (options?: {
  deterministicFiat?: boolean;
}) => {
  return createStateFixture({ base: 'empty' })
    .withMinimalBridgeController()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork(true)
    .withMinimalSmartTransactions()
    .withPreferences({
      smartTransactionsOptInStatus: false,
      useTokenDetection: false,
      tokenNetworkFilter: { '0x1': true },
    })
    .withMinimalGasFee()
    .withMinimalTransactionController()
    .withMinimalKeyringController()
    .withMinimalTokenRates()
    .withMinimalMultichainAssetsRates()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({});
};
```

You can still call `.withOverrides()` or use any builder helper for special cases.

### 4) Wallet preset and renderer

Render Wallet with its preset:

```ts
import { renderWalletView } from '../../util/test/integration/renderers/wallet';
import { WalletViewSelectorsIDs } from '../../../e2e/selectors/wallet/WalletView.selectors';

const { getByTestId } = renderWalletView({
  overrides: {
    settings: { basicFunctionalityEnabled: true },
    engine: {
      backgroundState: {
        MultichainNetworkController: { isEvmSelected: true },
        RewardsController: { activeAccount: null },
      },
    },
  },
});

expect(getByTestId(WalletViewSelectorsIDs.WALLET_CONTAINER)).toBeTruthy();
```

## Writing Tests (AAA and Naming)

Follow project testing guidelines:

- Action-oriented test names (no “should”)
- Arrange / Act / Assert with blank lines between sections
- One behavior per test
- Use `waitFor` or `act` for async state updates

Example:

```ts
it('enables confirm button when quote is available', () => {
  const { getByTestId } = renderBridgeView({
    overrides: {
      bridge: {
        sourceAmount: '1',
        // provide tokens and a recommended quote in overrides...
      },
    },
  });

  const button = getByTestId('bridge-confirm-button');

  expect(button).toBeTruthy();
  expect(
    (button as unknown as { props: { isDisabled?: boolean } }).props.isDisabled,
  ).not.toBe(true);
});
```

## Determinism

To make fiat assertions exact, use:

- `deterministicFiat: true` in the renderer options
- This injects stable `CurrencyRateController`/`TokenRatesController` into the background state for exact fiat

## Adding New View Presets

1. Create `app/util/test/integration/presets/<view>.ts` with a function like `initialState<PascalView>()`
2. Add `app/util/test/integration/renderers/<view>.ts` with a function `render<PascalView>(options)`
3. Keep Engine mocks centralized in `mocks.ts`
4. Only use state overrides and builder helpers to cover scenarios

## Execution

Faster local iteration:

```bash
yarn jest <path/to/test> -t "<test-name>" --runInBand --silent --coverage=false
```

## Do / Don’t

- Do: Mock only Engine and deterministic native values
- Do: Drive tests with Redux state from the fixture
- Don’t: Mock hooks, selectors, or component internals
- Don’t: Depend on non-deterministic values (time, network) without controlling them first

## Enforcement (Allowed mocks only)

To enforce integration purity, we have two layers:

1. Runtime guard prevents unauthorized mocks in integration tests:

- Location: `app/util/test/testSetup.js`
- Applies to files matching `*.integration.test.*`
- Only these `jest.mock(...)` calls are allowed:
  - `'../../../core/Engine'`
  - `'../../../core/Engine/Engine'`
  - `'react-native-device-info'`

Any other `jest.mock(...)` inside integration tests will throw an error at runtime.

2. ESLint override blocks unauthorized mocks statically:

- Location: root `.eslintrc.js`
- Override for `**/*.integration.test.{js,ts,tsx,jsx}`
- Disallows `jest.mock(...)` except for the whitelist above

```json
{
  "overrides": [
    {
      "files": ["**/*.integration.test.{ts,tsx,js,jsx}"],
      "rules": {
        "no-restricted-syntax": [
          "error",
          {
            "selector": "CallExpression[callee.object.name='jest'][callee.property.name='mock'][arguments.0.type='Literal'][arguments.0.value!='../../../core/Engine'][arguments.0.value!='../../../core/Engine/Engine'][arguments.0.value!='react-native-device-info']",
            "message": "Only Engine and react-native-device-info can be mocked in integration tests."
          }
        ]
      }
    }
  ]
}
```
