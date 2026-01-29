# MMConnect E2E Tests: Browser Playground Refactor Specification

## Overview

This document specifies the refactoring of existing MMConnect E2E tests (`appwright/tests/mm-connect/`) to use locally hosted test dapps via `@metamask/browser-playground` instead of remote GitHub Pages URLs.

---

## Current State Analysis

### Existing Test Files

| File                            | Current URL                                                   | Test Dapp            |
| ------------------------------- | ------------------------------------------------------------- | -------------------- |
| `connection-evm.spec.js`        | `https://metamask.github.io/connect-monorepo/legacy-evm-e2e/` | EVM Legacy Test Dapp |
| `connection-wagmi.spec.js`      | `https://metamask.github.io/connect-monorepo/wagmi-e2e/`      | Wagmi Test Dapp      |
| `connection-multichain.spec.js` | `http://10.0.2.2:3000/test-dapp-multichain`                   | Multichain Test Dapp |

### Current Selector Patterns

The existing tests use **XPath selectors with HTML `id` attributes**:

```javascript
// Current pattern (MultiChainEvmTestDapp.js)
return AppwrightSelectors.getElementByXpath(
  this._device,
  '//*[@id="connect-button"]',
);
```

---

## Browser Playground Architecture

### Source Location

```
/Users/user/Documents/MetaMask/connect-monorepo/playground/browser-playground/
```

### Key Components

| File                               | Purpose                                                  |
| ---------------------------------- | -------------------------------------------------------- |
| `src/App.tsx`                      | Main application with connect/disconnect buttons         |
| `src/components/LegacyEVMCard.tsx` | Legacy EVM connection card (sign, send tx, switch chain) |
| `src/components/WagmiCard.tsx`     | Wagmi connection card                                    |
| `src/components/ScopeCard.tsx`     | Multichain scope cards                                   |

### Selector Strategy: `data-testid` Attributes

**Important:** Browser Playground uses `data-testid` attributes (not `id` attributes) via the shared `@metamask/playground-ui` package.

The selectors must change from:

```javascript
// OLD: id-based selector
'//*[@id="connect-button"]';

// NEW: data-testid based selector
'//*[@data-testid="legacy-evm-btn-personal-sign"]';
```

---

## Test ID Registry (from `@metamask/playground-ui`)

### App-Level IDs

| Test ID                  | Description               |
| ------------------------ | ------------------------- |
| `app-container`          | Main app container        |
| `app-title`              | App title                 |
| `app-btn-connect`        | Default connect button    |
| `app-btn-connect-legacy` | Legacy EVM connect button |
| `app-btn-connect-wagmi`  | Wagmi connect button      |
| `app-btn-disconnect`     | Disconnect button         |
| `app-btn-reconnect`      | Reconnect button          |
| `app-section-scopes`     | Connected scopes section  |
| `app-section-connected`  | Connected state section   |
| `app-section-error`      | Error section             |

### Legacy EVM Card IDs

| Test ID                              | Description                      |
| ------------------------------------ | -------------------------------- |
| `legacy-evm-card`                    | Card container                   |
| `legacy-evm-title`                   | Card title                       |
| `legacy-evm-chain-id-label`          | Chain ID label                   |
| `legacy-evm-chain-id-value`          | Chain ID value display           |
| `legacy-evm-accounts-label`          | Accounts label                   |
| `legacy-evm-accounts-value`          | Accounts count display           |
| `legacy-evm-active-account`          | Active account display           |
| `legacy-evm-response-container`      | Response container               |
| `legacy-evm-response-label`          | Response label                   |
| `legacy-evm-response-text`           | Response text content            |
| `legacy-evm-btn-request-permissions` | wallet_requestPermissions button |
| `legacy-evm-btn-sign-typed-data-v4`  | eth_signTypedData_v4 button      |
| `legacy-evm-btn-personal-sign`       | personal_sign button             |
| `legacy-evm-btn-send-transaction`    | Send transaction button          |
| `legacy-evm-btn-switch-goerli`       | Switch to Goerli button          |
| `legacy-evm-btn-switch-mainnet`      | Switch to Mainnet button         |
| `legacy-evm-btn-switch-polygon`      | Switch to Polygon button         |
| `legacy-evm-btn-add-polygon-chain`   | Add Polygon chain button         |
| `legacy-evm-section-read-only`       | Read-only section                |
| `legacy-evm-btn-get-balance`         | eth_getBalance button            |
| `legacy-evm-btn-block-number`        | eth_blockNumber button           |
| `legacy-evm-btn-gas-price`           | eth_gasPrice button              |

### Wagmi Card IDs

| Test ID                            | Description                      |
| ---------------------------------- | -------------------------------- |
| `wagmi-card`                       | Card container                   |
| `wagmi-title`                      | Card title                       |
| `wagmi-chain-id-label`             | Chain ID label                   |
| `wagmi-chain-id-value`             | Chain ID value display           |
| `wagmi-account-label`              | Account label                    |
| `wagmi-account-value`              | Account value display            |
| `wagmi-active-account`             | Active account container         |
| `wagmi-balance-container`          | Balance container                |
| `wagmi-balance-value`              | Balance value                    |
| `wagmi-block-number-container`     | Block number container           |
| `wagmi-block-number-value`         | Block number value               |
| `wagmi-section-switch-chain`       | Switch chain section             |
| `wagmi-btn-switch-chain-{chainId}` | Switch to chain button (dynamic) |
| `wagmi-section-sign-message`       | Sign message section             |
| `wagmi-input-message`              | Message input field              |
| `wagmi-btn-sign-message`           | Sign message button              |
| `wagmi-signature-result`           | Signature result display         |
| `wagmi-section-send-transaction`   | Send transaction section         |
| `wagmi-input-to-address`           | To address input                 |
| `wagmi-input-amount`               | Amount input                     |
| `wagmi-btn-send-transaction`       | Send transaction button          |
| `wagmi-tx-hash-result`             | Transaction hash result          |
| `wagmi-tx-confirming`              | Transaction confirming text      |
| `wagmi-tx-confirmed`               | Transaction confirmed text       |
| `wagmi-tx-error`                   | Transaction error text           |
| `wagmi-section-connector`          | Connector section                |
| `wagmi-connector-account`          | Connector account                |
| `wagmi-connector-chain-id`         | Connector chain ID               |

### Scope Card IDs (Dynamic)

These use a pattern: `scope-card-{scope}` where `{scope}` is the CAIP-2 chain ID (e.g., `eip155-1`).

| Test ID Pattern                              | Description            |
| -------------------------------------------- | ---------------------- |
| `scope-card-{scope}`                         | Scope card container   |
| `scope-card-network-name-{scope}`            | Network name           |
| `scope-card-accounts-label-{scope}`          | Accounts label         |
| `scope-card-accounts-badge-{scope}`          | Accounts count badge   |
| `scope-card-account-select-{scope}`          | Account selector       |
| `scope-card-active-account-{scope}`          | Active account display |
| `scope-card-invoke-btn-{scope}`              | Invoke method button   |
| `scope-card-result-{scope}-{method}-{index}` | Result container       |

---

## Selector Mapping: Old → New

### Legacy EVM Test Selectors

| Old ID (GitHub Pages)       | New data-testid (Browser Playground)                       |
| --------------------------- | ---------------------------------------------------------- |
| `#connect-button`           | `app-btn-connect-legacy`                                   |
| `#terminate-button`         | `app-btn-disconnect`                                       |
| `#connected-status`         | `legacy-evm-active-account` (presence indicates connected) |
| `#personal-sign-button`     | `legacy-evm-btn-personal-sign`                             |
| `#request-response`         | `legacy-evm-response-text`                                 |
| `#send-transaction-button`  | `legacy-evm-btn-send-transaction`                          |
| `#switch-to-polygon-button` | `legacy-evm-btn-switch-polygon`                            |
| `#switch-to-mainnet-button` | `legacy-evm-btn-switch-mainnet`                            |
| `#connected-chain`          | `legacy-evm-chain-id-value`                                |
| `#connected-accounts`       | `legacy-evm-accounts-value`                                |
| `#eth-get-balance-button`   | `legacy-evm-btn-get-balance`                               |

### Wagmi Test Selectors

| Old ID (GitHub Pages)     | New data-testid (Browser Playground) |
| ------------------------- | ------------------------------------ |
| `#connect-MetaMask`       | `app-btn-connect-wagmi`              |
| `#disconnect-button`      | `app-btn-disconnect`                 |
| `#connected-status`       | `wagmi-account-value`                |
| `#connected-chain`        | `wagmi-chain-id-value`               |
| `#connected-account`      | `wagmi-active-account`               |
| `#sign-message-button`    | `wagmi-btn-sign-message`             |
| `#sign-message-response`  | `wagmi-signature-result`             |
| `#switch-chain-{chainId}` | `wagmi-btn-switch-chain-{chainId}`   |

---

## Implementation Plan: Option 1 (Standalone Helper)

This approach creates a simple, self-contained server helper specifically for Appwright tests without modifying the Detox framework infrastructure.

### Directory Structure

```
appwright/
├── tests/
│   └── mm-connect/
│       ├── connection-evm.spec.js      # Refactor
│       ├── connection-wagmi.spec.js    # Refactor
│       ├── connection-multichain.spec.js
│       └── helpers/
│           └── PlaygroundDappServer.js # NEW: Server helper
│
wdio/
└── screen-objects/
    └── BrowserPlaygroundDapp.js        # NEW: Page object
```

### Step 1: Add Dependency

```bash
yarn add @metamask/browser-playground@0.1.0 --dev
```

### Step 2: Create Server Helper

Create `appwright/tests/mm-connect/helpers/PlaygroundDappServer.js`:

- Uses Node.js `http` module with `serve-handler` for static file serving
- Serves files from `node_modules/@metamask/browser-playground/dist`
- Provides platform-aware URL generation:
  - Android: `http://10.0.2.2:{port}`
  - iOS: `http://localhost:{port}`
- Handles ADB reverse port forwarding for Android emulator
- Exposes `start()`, `stop()`, and `getUrl(platform)` methods

### Step 3: Create Page Object

Create `wdio/screen-objects/BrowserPlaygroundDapp.js`:

**Key changes from existing page objects:**

1. Use `data-testid` attribute selectors instead of `id` selectors
2. Update XPath pattern:

   ```javascript
   // OLD
   '//*[@id="connect-button"]';

   // NEW
   '//*[@data-testid="app-btn-connect-legacy"]';
   ```

3. Support both iOS and Android selectors (existing pattern already supports this)

### Step 4: Update Test Specs

Modify test files to:

1. Import and use `PlaygroundDappServer` helper
2. Start server in `test.beforeAll()` hook
3. Stop server in `test.afterAll()` hook
4. Replace URL constants with dynamic URLs from server helper
5. Replace page object imports (or create adapter)

**Test lifecycle:**

```
beforeAll → Start PlaygroundDappServer
  ↓
test() → Navigate to local URL, run test scenarios
  ↓
afterAll → Stop PlaygroundDappServer
```

### Step 5: Android Port Forwarding

For Android emulator access, set up ADB reverse in the server helper:

```javascript
// In PlaygroundDappServer.js start() method
execSync(`adb reverse tcp:${this.port} tcp:${this.port}`);
```

Or as a pre-test script if preferred.

---

## Behavioral Differences to Consider

### Connection Flow

**Old (GitHub Pages dapps):**

- Single-purpose test dapps with pre-configured connection methods
- Hardcoded chain IDs and network configurations

**New (Browser Playground):**

- Unified playground supporting multiple connection types
- User must select scopes/chains before connecting
- Three connection modes: CAIP Multichain, Legacy EVM, Wagmi

### UI State Checking

**Old pattern:**

```javascript
// Check #connected-status text content
await MultiChainEvmTestDapp.assertDappConnected('true');
```

**New pattern:**

```javascript
// Check presence of active account element OR connection status
await BrowserPlaygroundDapp.assertConnected(true);
// OR check for presence of legacy-evm-active-account element
```

### Response Verification

**Old:** Single `#request-response` element
**New:** `legacy-evm-response-text` element (appears conditionally when response exists)

---

## Implementation Checklist

### Phase 1: Setup

- [ ] Add `@metamask/browser-playground@0.1.0` to `package.json`
- [ ] Verify package structure: check `dist/` folder contents
- [ ] Confirm build output can be served as static files

### Phase 2: Server Helper

- [ ] Create `appwright/tests/mm-connect/helpers/PlaygroundDappServer.js`
- [ ] Implement `start(port)` method with `serve-handler`
- [ ] Implement `stop()` method
- [ ] Implement `getUrl(platform)` method
- [ ] Add ADB reverse setup for Android
- [ ] Test server locally: `http://localhost:8090`

### Phase 3: Page Object

- [ ] Create `wdio/screen-objects/BrowserPlaygroundDapp.js`
- [ ] Implement selectors using `data-testid` attribute pattern
- [ ] Implement action methods: `tapConnect()`, `tapSign()`, etc.
- [ ] Implement assertion methods: `assertConnected()`, `assertChainId()`, etc.
- [ ] Add iOS selector support (same testids work for both platforms)

### Phase 4: Test Refactoring

- [ ] Update `connection-evm.spec.js`:
  - [ ] Add server lifecycle hooks
  - [ ] Replace URL constant
  - [ ] Replace page object usage
  - [ ] Adjust assertions for new UI patterns
- [ ] Update `connection-wagmi.spec.js`:
  - [ ] Add server lifecycle hooks
  - [ ] Replace URL constant
  - [ ] Replace page object usage
  - [ ] Adjust chain switch selectors (now dynamic)
- [ ] Verify `connection-multichain.spec.js` compatibility

### Phase 5: Validation

- [ ] Run tests on Android emulator locally
- [ ] Run tests on iOS simulator locally
- [ ] Verify all test scenarios pass
- [ ] Update CI configuration if needed

---

## Risk Mitigation

### Rollback Strategy

Keep both URL options available during transition:

```javascript
const USE_LOCAL_DAPP = process.env.USE_LOCAL_PLAYGROUND === 'true';
const DAPP_URL = USE_LOCAL_DAPP
  ? PlaygroundDappServer.getUrl(platform)
  : 'https://metamask.github.io/connect-monorepo/legacy-evm-e2e/';
```

### Potential Issues

1. **Package build structure** - Verify `@metamask/browser-playground` has a `dist/` folder with servable static files
2. **Port conflicts** - Default to port 8090; add retry logic if port is busy
3. **Selector timing** - Browser playground may have different render timing; adjust wait strategies
4. **Chain configuration** - Browser playground requires explicit scope selection; may need to add setup steps

---

## References

- **Browser Playground Source**: `/Users/user/Documents/MetaMask/connect-monorepo/playground/browser-playground/`
- **Test ID Registry**: `/Users/user/Documents/MetaMask/connect-monorepo/playground/playground-ui/src/testIds/index.ts`
- **Current MMConnect Tests**: `appwright/tests/mm-connect/`
- **Existing Page Objects**: `wdio/screen-objects/MultiChainEvmTestDapp.js`, `wdio/screen-objects/WagmiTestDapp.js`
