# Component View Testing Rules (Mobile)

This document defines the rules for writin component-view tests in this project. It complements the framework docs at `app/util/test/view/README.md` and must be followed for new and existing component-view tests.

These rules are written to align with Cursor Context Rules so the guidance is easy to consume inside Cursor. See the official guidance: [Cursor Context Rules](https://cursor.com/docs/context/rules).

## Authoring in Cursor (Context Rules)

- Use headings with `###`/`##`, avoid `#` (too heavy).
- Use bold for key information and backticks for file/function/class names.
- When showing code:
  - For existing code in the repo, prefer Code References with the exact format:
    ```
    12:14:app/components/Todo.tsx
    export const Todo = () => <div>Todo</div>;
    ```
  - For new or proposed code, use standard markdown code blocks with a language tag, not Code References:
    ```ts
    it('renders title', () => { ... });
    ```
  - Never include line numbers inside the code content.
  - Do not indent triple backticks and always add a blank line before the fence.
- Do not paste bare URLs; use markdown links (or wrap as code if needed).
- Keep messages concise and skimmable; only include relevant code or commands.

## Golden Rules

1. Only mock the Engine (and allowed native modules)

- Allowed mocks in component-view tests:
  - `../../../core/Engine`
  - `../../../core/Engine/Engine`
  - `react-native-device-info`
- Enforced by:
  - Runtime guard in `app/util/test/testSetupView.js` (blocks other `jest.mock` in `*.view.test.*`)
  - ESLint override in root `.eslintrc.js` (disallows other `jest.mock` in `*.view.test.*`)

2. Drive behavior via Redux state (no mocking hooks or selectors)

- Do not mock hooks or selectors.
- Provide all required data through the Redux state using the state fixture.

3. Reuse the component-view test framework pieces

- Presets:
  - `initialStateBridge` → `app/util/test/component-view/presets/bridge.ts`
  - `initialStateWallet` → `app/util/test/component-view/presets/wallet.ts`
- Renderers:
  - `renderBridgeView` → `app/util/test/component-view/renderers/bridge.ts`
  - `renderWalletView` → `app/util/test/component-view/renderers/wallet.ts`
- Global Engine + native mocks:
  - `app/util/test/component-view/mocks.ts`
- State fixture and helpers:
  - `app/util/test/component-view/stateFixture.ts`

4. Keep overrides minimal and local to the test

- Start from a preset (e.g., `initialStateBridge()`), then apply `.withOverrides({ ... })` for the specific scenario.
- Prefer `deterministicFiat: true` for exact fiat assertions.
- Use specialized helpers (e.g., `withBridgeRecommendedQuoteEvmSimple`) when a complete, valid quote is needed.

5. Follow the unit testing naming/AAA rules

- Use action-oriented test names, avoid “should”.
- Strict AAA pattern with blank lines between Arrange / Act / Assert.
- One behavior per test.
- See project “Unit Testing Guidelines” for details.

## How to Write component-view Tests

### Rendering a View

- Preferred: use a view-specific renderer:

```ts
import '../../util/test/component-view/mocks';
import { renderBridgeView } from '../../util/test/component-view/renderers/bridge';

const { getByTestId } = renderBridgeView({
  deterministicFiat: true, // optional: exact fiat outputs
  overrides: {
    bridge: {
      sourceAmount: '1',
      // sourceToken, destToken...
    },
    // engine.backgroundState overrides only if absolutely needed
  },
});
```

- Alternatively (navigation tests): build state via preset and pass into `renderScreenWithRoutes`:

```ts
import { initialStateBridge } from '../../util/test/component-view/presets/bridge';
import { renderScreenWithRoutes } from '../../util/test/component-view/render';
import Routes from '../../../constants/navigation/Routes';
import BridgeView from './index';

const state = initialStateBridge()
  .withOverrides({
    bridge: {
      /* minimal scenario state */
    },
  })
  .build();

renderScreenWithRoutes(
  BridgeView as unknown as React.ComponentType,
  { name: Routes.BRIDGE.ROOT },
  [{ name: Routes.BRIDGE.MODALS.ROOT, Component: ModalProbe }],
  { state },
);
```

### Deterministic Fiat

- When asserting exact fiat values, pass `deterministicFiat: true` to the renderer or preset. This injects rate controllers for stable formatting.

### Quotes and CTA enablement

- To enable bridge confirm CTA, provide a valid quote in the background state:
  - The easiest path is `withBridgeRecommendedQuoteEvmSimple(params)` on the state fixture.
  - Or override `engine.backgroundState.BridgeController` with:
    - `quotes: [recommendedQuote]`
    - `recommendedQuote: recommendedQuote`
    - `quotesLastFetched: Date.now()`
    - `quotesLoadingStatus: 'SUCCEEDED'`
  - Ensure remote feature flags enable bridge for the target chain(s):
    - `engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2` with `support: true`, and active source/dest flags

### Navigation Tests

- Use `renderScreenWithRoutes` to probe nested navigation routes.
- Provide the baseline state via `initialStateBridge()` (or `initialStateWallet()`), plus small overrides.
- Assert using route names from `app/constants/navigation/Routes.ts`.
- Example: to open Destination Network Selector in BridgeView, act on “Swap to” button and assert `Routes.BRIDGE.MODALS.DEST_NETWORK_SELECTOR`.

### UI Assertions

- Prefer robust assertions (presence/absence, enabled/disabled) over brittle string formatting checks, unless `deterministicFiat` is used.
- Use Testing Library queries: `getByTestId`, `findByText`, `queryByTestId`, `within(...)`.

### Test Execution

- For faster iteration:

```bash
yarn jest -c jest.config.view.js <path/to/test> -t "<name>" --runInBand --silent --coverage=false
```

- Only use yarn (no npm/npx).

## Do / Don’t

- Do:
  - Mock only Engine + allowed native module(s)
  - Drive tests exclusively through Redux state
  - Reuse presets, renderers and the state fixture helpers
  - Keep overrides minimal and scenario-focused
  - Use `deterministicFiat` when asserting exact currency values
  - Follow AAA and naming rules
- Don’t:
  - Mock hooks or selectors
  - Rebuild entire background state manually (use presets)
  - Use arbitrary `jest.mock` in component-view files (blocked)

## Where to Find Things

- Engine and native mocks: `app/util/test/component-view/mocks.ts`
- Render helpers:
  - `app/util/test/component-view/render.tsx`
  - `app/util/test/component-view/renderers/bridge.ts`
  - `app/util/test/component-view/renderers/wallet.ts`
- Presets:
  - `app/util/test/component-view/presets/bridge.ts`
  - `app/util/test/component-view/presets/wallet.ts`
- State fixture + helpers: `app/util/test/component-view/stateFixture.ts`
- Framework overview: `app/util/test/component-view/README.md`
- Enforcement:
  - `.eslintrc.js` (override for `**/*.view.test.*`)
  - `app/util/test/testSetupView.js` (runtime guard)
