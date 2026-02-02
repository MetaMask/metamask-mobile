# Component View Test Framework

## What are Component View Tests?

Component view tests are integration tests that render full screens/pages with realistic app state (Redux, navigation, etc.) in a test environment—without running the full app on a device.

They sit between unit tests and E2E tests in the testing pyramid:

- **More realistic than unit tests**: Test full screens with real Redux, selectors, and hooks
- **Faster than E2E tests**: No device/simulator needed, run in Jest
- **State-driven**: Control what you test by setting up state, not by clicking through the UI

## Goals

This framework provides:

- Only mock the Engine and native modules necessary for deterministic environments
- Build and control application state through a single, composable fixture
- Provide view-specific presets and render helpers for concise, declarative tests
- Avoid mocking hooks or selectors – the UI should consume Redux state naturally

## Principles

- Single Engine mock: `app/util/test/component-view/mocks.ts`
  - Provides minimal controller APIs and stubs for background interactions (e.g., `NetworkController.getNetworkClientById`)
  - Deterministic native data (e.g., `react-native-device-info`)
- State-driven tests:
  - Use `createStateFixture` to construct a realistic Redux state
  - Override only what is specific to each scenario
  - Satisfy selectors by providing the data they expect in state
- No hook/selector mocking:
  - All data consumed by hooks/selectors must come from the state
- Developer ergonomics:
  - View presets in `presets/*` give a "ready-to-render" baseline per view
  - Render helpers in `renderers/*` remove boilerplate and centralize routing

## When to Use Component Tests

Component tests sit between unit tests and E2E tests in the testing pyramid. Use this guidance to determine the right test type for your scenario.

### Quick Reference Table

| Scenario                                    | Unit | Component | E2E |
| ------------------------------------------- | ---- | --------- | --- |
| Testing pure logic or calculations          | ✅   | ❌        | ❌  |
| Testing a screen with different state       | ❌   | ✅        | ❌  |
| Testing button click behavior on one screen | ❌   | ✅        | ❌  |
| Testing form validation display             | ❌   | ✅        | ❌  |
| Testing multi-screen flow                   | ❌   | ❌        | ✅  |
| Testing native features (biometrics, etc.)  | ❌   | ❌        | ✅  |
| Testing dApp connection                     | ❌   | ❌        | ✅  |
| Fast feedback in CI                         | ✅   | ✅        | ❌  |

### Component/View vs E2E

This is the part that's easy to misunderstand. Here's how to decide:

#### Choose Component/View When:

- Testing a single screen with realistic state
- You need to test UI behavior based on data/state
- You want fast, reliable tests that don't need a real device
- Testing conditional rendering or component interactions
- Testing user interactions that stay on one screen

**Examples:**

- "Wallet screen shows correct balance and token list"
- "Bridge view enables confirm button when quote loads"
- "Send screen validates recipient address format"
- "Settings toggle updates local state correctly"

#### Choose E2E When:

- Flow spans multiple screens (e.g., onboarding → wallet → send)
- Testing external integrations (dApps, payment providers)
- Validating platform-specific behavior (iOS vs Android)
- Testing critical paths that generate revenue

**Examples:**

- "User completes onboarding and sees wallet home screen"
- "User sends tokens and confirms transaction on blockchain"
- "User connects wallet to dApp and signs message"
- "User enables biometric login and unlocks app with fingerprint"

**Remember:** E2E is a last resort. If you can test it with a component test, do that instead.

## Platform Matrix (iOS / Android)

By default, you can execute tests for both platforms using the platform helpers.

### Writing Platform-Specific Tests

Import helpers and define tests parameterized by platform:

```ts
import { itForPlatforms, describeForPlatforms } from '../../platform';
import { renderBridgeView } from './renderers/bridge';

describeForPlatforms('BridgeView', ({ os }) => {
  itForPlatforms('renders BridgeView', () => {
    const { getByTestId } = renderBridgeView({ deterministicFiat: true });
    // Platform-specific assertions if needed
    // if (os === 'ios') { ... } else { ... }
  });
});
```

### Filtering by Platform

**Global filtering** using `TEST_OS`:

- `TEST_OS=ios yarn jest <path>` - Run only iOS tests
- `TEST_OS=android yarn jest <path>` - Run only Android tests
- Without `TEST_OS`, both `ios` and `android` run

**Per-test filtering**:

- `itForPlatforms('name', fn, { only: 'ios' })` - Run only on iOS
- `itForPlatforms('name', fn, { skip: ['android'] })` - Skip on Android

## Layout

```
app/util/test/component-view/
├─ mocks.ts                     # Engine + native mocks (single source of truth)
├─ render.ts                    # Base render helper for any screen
├─ stateFixture.ts              # State builder with chainable helpers
├─ presets/
│  ├─ bridge.ts                 # Bridge preset (baseline)
│  └─ wallet.ts                 # Wallet preset (baseline)
└─ renderers/
   ├─ bridge.ts                 # Render helper for BridgeView
   └─ wallet.ts                 # Render helper for Wallet view

Configuration:
├─ jest.config.view.js          # Isolated Jest config for view tests
└─ app/util/test/testSetupView.js # Clean setup environment + runtime guard
```

## Usage

### 1) Import the Engine mock once per test file

```ts
import '../../util/test/component-view/mocks';
```

This ensures only the Engine (and allowed native bits) are mocked globally.

### 2) Render a screen using a view-specific renderer

```ts
import { renderBridgeView } from '../../util/test/component-view/renderers/bridge';

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
  return createStateFixture()
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
import { renderWalletView } from '../../util/test/component-view/renderers/wallet';
import { WalletViewSelectorsIDs } from '../../../components/Views/Wallet/WalletView.testIds';

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

## Writing Tests

Follow project testing guidelines:

- **Action-oriented test names** (no "should")
- **Arrange / Act / Assert** with blank lines between sections
- **One behavior per test**
- Use `waitFor` or `act` for async state updates

### Example

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

### Deterministic Fiat Values

For tests that need exact fiat value assertions:

- Set `deterministicFiat: true` in the renderer options
- This injects stable `CurrencyRateController`/`TokenRatesController` into the background state
- Ensures consistent, predictable fiat conversions across test runs

## Adding New View Presets

1. Create `app/util/test/component-view/presets/<view>.ts` with a function like `initialState<PascalView>()`
2. Add `app/util/test/component-view/renderers/<view>.ts` with a function `render<PascalView>(options)`
3. Keep Engine mocks centralized in `mocks.ts`
4. Only use state overrides and builder helpers to cover scenarios

## Execution

Faster local iteration:

```bash
yarn jest -c jest.config.view.js <path/to/test> -t "<test-name>" --runInBand --silent --coverage=false
```

## Best Practices & Enforcement

### Do's and Don'ts

**Do:**

- ✅ Mock only Engine and deterministic native values
- ✅ Drive tests with Redux state from the fixture
- ✅ Use presets as your starting point
- ✅ Keep tests focused on user-facing behavior

**Don't:**

- ❌ Mock hooks, selectors, or component internals
- ❌ Depend on non-deterministic values (time, network) without controlling them first
- ❌ Test implementation details
- ❌ Create overly complex test setups

### Enforcement

To enforce component-view purity, we rely on a static ESLint guard that blocks unauthorized mocks:

**ESLint Configuration:**

- Location: root `.eslintrc.js`
- Files: `**/*.view.test.{js,ts,tsx,jsx}`
- Blocks `jest.mock(...)` except for allowed modules

**Allowed mocks:**

- `../../../core/Engine`
- `../../../core/Engine/Engine`
- `react-native-device-info`

```js
// .eslintrc.js
{
  files: ['**/*.view.test.{js,ts,tsx,jsx}'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "CallExpression[callee.object.name='jest'][callee.property.name='mock'][arguments.0.type='Literal'][arguments.0.value!='../../../core/Engine'][arguments.0.value!='../../../core/Engine/Engine'][arguments.0.value!='react-native-device-info']",
        message:
          'Only Engine and react-native-device-info can be mocked in component-view tests.',
      },
    ],
  },
}
```
