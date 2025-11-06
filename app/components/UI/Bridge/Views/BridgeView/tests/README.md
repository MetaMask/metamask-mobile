## BridgeView test pattern

This folder contains test utilities for BridgeView:

- `renderBridgeScreen.tsx`: screen-specific render that wraps the existing project `renderScreen` with the correct route and allows injecting initial Redux state and route params.
- `BridgeView.screen-object.ts`: a Screen Object (robot) exposing high-level actions and assertions for BridgeView.
- `BridgeView.builders.ts`: builders for initial state and utilities:
  - `buildDefaultState`, `withSourceAmount`, `withSourceToken`, `withDestToken`
  - `buildStateWith` (preferred) to build state with `sourceAmount`, `sourceToken`, `destToken` and controller overrides
  - Tokens: `nativeEth`, `minimalUsdc`, `minimalMusd`, `tokenFactory(id, overrides)`
  - Feature flags: `markNoFeeDestAsset`
  - Quotes scenarios: `scenarioQuotes`, `scenarioLoadingNoQuote`, `scenarioFetchedWithQuote`, `scenarioMetabridgeBpsFee`

### Usage

```ts
import { renderBridgeScreen } from './tests/renderBridgeScreen';
import { bridgeViewRobot } from './tests/BridgeView.screen-object';
import {
  buildStateWith,
  nativeEth,
  minimalMusd,
  tokenFactory,
  scenarioMetabridgeBpsFee,
  markNoFeeDestAsset,
} from './tests/BridgeView.builders';
import { RequestStatus } from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';

// Compose state: amount + tokens + controller overrides
let state = buildStateWith({
  controllerOverrides: {
    quotesLoadingStatus: RequestStatus.FETCHED,
    quotesLastFetched: 12,
  },
  sourceAmount: '1.0',
  sourceToken: tokenFactory('ETH', { chainId: '0x1' as Hex }),
  destToken: tokenFactory('mUSD', { chainId: '0x1' as Hex }),
});

// Set feature flag: no fee assets for mUSD in eip155:1
state = markNoFeeDestAsset(state, 'eip155:1', minimalMusd().address as Hex);

// Mock fee scenario on quote (bps = 0)
scenarioMetabridgeBpsFee(0);

renderBridgeScreen(state);
bridgeViewRobot().expectSelectAmount();
```

### Conventions

- Follow AAA (Arrange – Act – Assert)
- Prefer semantic queries and robot methods; fall back to `testID` only when necessary (e.g., numeric keypad input field)
- Avoid deep snapshots; assert observable behavior/text
- Keep external APIs mocked via centralized scenarios or specific hooks

### Builder guidance

- Prefer `buildStateWith` for most tests. It focuses on the relevant overrides and keeps tests concise.
- Use `tokenFactory(id, overrides)` to quickly obtain common tokens. `id` can be a known symbol (`ETH`, `USDC`, `mUSD`) or an address. Use `overrides` to set `chainId`, `decimals`, etc.
- Use the granular helpers (`withSourceAmount`, `withSourceToken`, `withDestToken`) if you need to compose state transforms explicitly.
- Fall back to `createBridgeTestState` only when you need low-level control over controller/reducer shapes beyond `buildStateWith` capabilities.
- If `buildStateWith` starts growing, prefer adding small composition helpers in the builders rather than expanding its responsibility.
