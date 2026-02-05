# Component View Test Framework

## What are Component View Tests?

Component view tests are integration tests that render full screens/pages with realistic app state (Redux, navigation, etc.) in a test environment—without running the full app on a device.

They sit between unit tests and E2E tests in the testing pyramid:

- **More realistic than unit tests**: Test full screens with real Redux, selectors, and hooks
- **Faster than E2E tests**: No device/simulator needed, run in Jest
- **State-driven**: Control what you test by setting up state, not by clicking through the UI

## When to Use Component View Tests

Component tests sit between unit tests and E2E tests in the testing pyramid. Use this guidance to determine the right test type for your scenario.

### Quick Reference Table

| Scenario                                    | Unit | Component | E2E |
| ------------------------------------------- | ---- | --------- | --- |
| Testing pure logic or calculations          | ✅   | ❌        | ❌  |
| Testing a screen with different state       | ❌   | ✅        | ❌  |
| Testing button click behavior on one screen | ❌   | ✅        | ❌  |
| Testing form validation display             | ❌   | ✅        | ❌  |
| Testing multi-screen flow                   | ❌   | ✅        | ✅  |
| Testing native features (biometrics, etc.)  | ❌   | ❌        | ✅  |
| Testing dApp connection                     | ❌   | ❌        | ✅  |
| Fast feedback in CI                         | ✅   | ✅        | ❌  |

## Unit Tests vs Component View Tests

Many existing unit tests in our codebase are **shallow component tests** meaning they render a single component in isolation and replace its dependencies with mocks. Component view tests take the opposite approach where they render a full screen with real app state and only mock what is strictly necessary.

### What our Unit Tests Do Today

Typical unit tests for screens/components in our repo often:

- **Use Enzyme `shallow()`** – Renders only the top-level component; child components are replaced by placeholders. You never see the real UI tree or real selector/hook behavior.
- **Mock heavily** – Child components, hooks, selectors, utils, Engine, navigation, and feature flags are all mocked (`jest.mock(...)`). The component under test is the only “real” code; everything it depends on is stubbed.
- **Assert on implementation** – Tests check internal structure: `wrapper.find(SomeChild)`, `wrapper.props()`, `wrapper.state()`, or that specific subcomponents were called with certain props. That ties tests to how the component is built, not what the user sees or can do.
- **Isolate the unit** – The goal is to test “this component in isolation.” That makes tests fast and avoids pulling in Redux/navigation, but it also means you are not testing how the component behaves with real data flow (real selectors, real hooks, real children).
- **Snapshots of heavily mocked trees are low signal** – When you snapshot a shallow-rendered component, the output is dominated by mocked children (which often render as `null` or simple stubs like `<View />`). You are not capturing the actual UI the user would see, so snapshot diffs don’t reliably tell you whether user-visible behavior changed.

So “shallow” here means: **shallow rendering** (Enzyme) and **shallow integration** (lots of mocks, minimal real behavior). The component is exercised, but not in a realistic environment.

### What Component View Tests Will Do Instead

The Component view tests will:

- **Render full screens** – The entire view (e.g. BridgeView, WalletView) is mounted with React Testing Library. Real child components render; you see the same component tree the user would see (minus native/Engine side effects we explicitly mock).
- **Mock only Engine and allowed native modules** – Only `Engine` (and `Engine/Engine`) and `react-native-device-info` may be mocked (enforced by ESLint and test setup). Hooks, selectors, and child components are **not** mocked.
- **Drive behavior via state** – You control the scenario by building Redux state with presets and overrides (e.g. `createStateFixture()`, `initialStateBridge()`, `renderBridgeView({ overrides: { ... } })`). Selectors and hooks read from that state; the UI reacts to it. You test “when state looks like X, the user sees Y and can do Z.”
- **Assert on user-facing behavior** – Tests use queries and matchers that reflect what the user sees and does: `getByTestId`, `findByText`, `fireEvent.press`, “confirm button is enabled,” “fiat value shows $19,000.00.” Implementation details (which child was rendered, internal state) are not the focus.
- **Avoid snapshots in favor of targeted assertions** – The full component tree in a component view test is large and changes often, so snapshots would be noisy and brittle. Instead, assert on specific user-visible elements and outcomes (e.g. “this label is present,” “this button is enabled”). That keeps tests stable and meaningful when the tree evolves.

So the “new” approach is **full-screen, state-driven, behavior-focused**: minimal mocks, real data flow, and assertions that match user-visible outcomes.

### Side-by-Side Comparison

| Aspect                    | Unit tests (current)                                                                | Component view tests                                                              |
| ------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Rendering**             | One component, children stubbed (e.g. Enzyme `shallow`) or many children mocked out | Full screen; real children and real component tree                                |
| **Mocks**                 | Many: child components, hooks, selectors, Engine, nav, utils, feature flags         | Only Engine + `react-native-device-info` (enforced)                               |
| **Data source**           | Mock return values per hook/selector/util                                           | Redux state from fixture/preset/overrides                                         |
| **Assertions**            | Implementation: `wrapper.find()`, props, state, “component X was called with Y”     | Behavior: what’s on screen, what’s enabled, what happens on press                 |
| **When something breaks** | Fails can be due to refactors (e.g. renaming a child) even if behavior is correct   | Fails when user-visible behavior or state-driven outcome changes                  |
| **Snapshots**             | Often used; output is mostly mocked stubs (`null`/simple nodes), not real UI        | Avoided; full tree is too large and volatile; assert on specific elements instead |
| **Best for**              | Pure logic, small units, or legacy tests that already use this style                | A full screen with different state scenarios and user interactions                |

### When to Use Which

- **Keep or add unit tests** for: pure functions, reducers, selectors, utilities, and small units where “behavior” is just “output for given input.” No need for a full screen or Redux.
- **Prefer component view tests** for: “Does this screen show the right thing for this state?” and “Does this interaction on this screen work?” That’s where shallow tests are brittle (many mocks, implementation-coupled) and component view tests give better confidence with state-driven, behavior-focused assertions.

In short: **unit tests** = isolate one component and mock the rest; **component view tests** = render the view with real app state and minimal mocks, and assert on what the user sees and can do.

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
