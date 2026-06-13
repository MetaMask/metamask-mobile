# Anvil and Asset Detection in E2E Tests

## Why Assets Don't Show Up on Anvil

Anvil uses chain ID `1337` (`0x539`). This chain ID is absent from **every allowlist** the app uses to decide which networks get automatic asset discovery, polling, balance refresh, and search. There are 4 independent gating mechanisms, all of which exclude chain 1337.

---

## Root Causes (4 Gates)

### Gate 1 — Hardcoded Token Detection Safelist (Primary)

**File:** `node_modules/@metamask/assets-controllers/dist/assetsUtil.mjs`

```javascript
export var SupportedTokenDetectionNetworks = {
  Mainnet: '0x1',
  Bsc: '0x38',
  Polygon: '0x89',
  Avax: '0xa86a',
  Aurora: '0x4e454152',
  LineaGoerli: '0xe704',
  LineaMainnet: '0xe708',
  Arbitrum: '0xa4b1',
  Optimism: '0xa',
  Base: '0x2105',
  Zksync: '0x144',
  Cronos: '0x19',
  Celo: '0xa4ec',
  Gnosis: '0x64',
  Fantom: '0xfa',
  PolygonZkevm: '0x44d',
  Moonbeam: '0x504',
  Moonriver: '0x505',
  Sei: '0x531',
  MonadMainnet: '0x8f',
  Hyperevm: '0x3e7',
};
// 0x539 is NOT here.
```

In `TokenDetectionController._getChainCacheForDetection()` (line 464):

```javascript
if (!isTokenDetectionSupportedForNetwork(chainId)) {
  return null; // ← 0x539 dies here
}
```

**Effect:** Auto-detection returns `null` cache → `_detectTokensUsingRpc` skips the chain. No tokens are ever auto-discovered.

### Gate 2 — Popular Networks Filter in Balance Refresh

**File:** `app/components/Views/Wallet/hooks/useBalanceRefresh.ts:28,67-72`

```typescript
const { popularEvmNetworks: evmChainIds } = useNetworkEnablement();
// ...
TokenDetectionController.detectTokens({ chainIds: evmChainIds }),   // 1337 not included
TokenBalancesController.updateBalances({ chainIds: evmChainIds }),  // 1337 not included
```

`useNetworkEnablement()` calls `NetworkEnablementController.listPopularEvmNetworks()`, which returns chains from `PopularList` in `app/util/networks/customNetworks.tsx`. That list has Avalanche, Arbitrum, BSC, Base, HyperEVM, OP, Polygon, zkSync, Sei, Monad, MegaETH, Tempo, Arc — **no 1337**.

**Effect:** Pull-to-refresh never queries Anvil for token detection or balances.

### Gate 3 — Enabled Networks Filter in Background Polling

**File:** `app/components/hooks/AssetPolling/use-polling-networks.ts:15-28`

```typescript
return (enabledEvmNetworks || [])
  .map((network) => networkConfigurations[network])
  .filter(Boolean);
```

`selectEVMEnabledNetworks` reads from `NetworkEnablementController`'s `enabledNetworkMap.eip155`. If Anvil (1337) is added as a custom RPC but not explicitly enabled in this controller, background polling skips it.

**Effect:** Background `useTokenDetectionPolling` never runs for Anvil.

### Gate 4 — Token Search API Probe

**File:** `app/components/Views/AddAsset/Views/TokenView/TokenView.tsx:39-55`

```typescript
const { error: searchProbeError } = useSearchRequest({
  chainIds: selectedNetwork ? [formatChainIdToCaip(selectedNetwork)] : [],
  query: 'USD',
  limit: 1,
  includeMarketData: false,
});

const chainSupportsSearch = useMemo(() => {
  if (!selectedNetwork) return false;
  if (isNonEvmChainId(selectedNetwork)) return true;
  return !searchProbeError; // ← API errors for eip155:1337
}, [selectedNetwork, searchProbeError]);
```

The search API has no data for `eip155:1337`. It returns an error → `chainSupportsSearch = false` → **the "Search Token" tab is hidden**.

---

## The Working Path: Manual Custom Token Import

Manual import bypasses all 4 gates because `AddCustomToken.tsx` makes **direct RPC calls** to the Anvil node — no allowlist checks, no API dependencies.

**File:** `app/components/Views/AddAsset/components/AddCustomToken/AddCustomToken.tsx:134-148`

```typescript
const isContract = await isSmartContractAddress(trimmed, chainId);
// ...
const [d, s, n] = await Promise.all([
  AssetsContractController.getERC20TokenDecimals(trimmed, clientId), // direct RPC
  AssetsContractController.getERC721AssetSymbol(trimmed, clientId), // direct RPC
  AssetsContractController.getERC20TokenName(trimmed, clientId), // direct RPC
]);
```

These go straight to `http://localhost:8545` — Anvil responds normally.

---

## Steps to Add Assets on Anvil

### 1. Deploy the contract on Anvil (before the test)

```typescript
// tests/seeder/anvil-seeder.ts
await anvilSeeder.deploySmartContract(SMART_CONTRACTS.HST, 'muirGlacier');
const tokenAddress = await contractRegistry.getContractAddress(
  SMART_CONTRACTS.HST,
);
```

### 2. Configure the network in the app (chain ID 1337, RPC http://localhost:8545)

```typescript
// In E2E fixture:
new FixtureBuilder().withNetworkController({
  chainId: '0x539', // 1337 in hex
  rpcUrl: `http://localhost:${anvilPort}`,
  type: 'custom',
  nickname: 'Local RPC',
  ticker: 'ETH',
});
```

Or via UI: Settings → Networks → Add Network → Custom Network → RPC URL, chain ID `1337`, symbol `ETH`.

### 3. Switch to the Localhost network in the wallet

### 4. Import the token by address (the only path that works)

- Tap "Import Tokens" → go to the **"Custom Token"** tab (the "Search" tab is hidden — see Gate 4)
- Enter the deployed contract address
- Wait ~20 seconds for the app to fetch `decimals`, `symbol`, `name` via direct RPC
- Verify the auto-populated symbol (e.g., `TST`)
- Tap "Import Token" → Confirm

### 5. Token appears with its balance

Balance fetching (`TokenBalancesController.updateBalances`) uses direct multicall RPC, which works.

---

## What Does NOT Work (And Why)

| Approach                  | Blocked By | Root Cause                                                                |
| ------------------------- | ---------- | ------------------------------------------------------------------------- |
| Auto-detection            | Gate 1     | `isTokenDetectionSupportedForNetwork('0x539')` → `false` (hardcoded enum) |
| Pull-to-refresh discovery | Gate 2     | `popularEvmNetworks` excludes 1337 (not in `PopularList`)                 |
| Background polling        | Gate 3     | `NetworkEnablementController.enabledNetworkMap` doesn't include 1337      |
| Token search              | Gate 4     | Search API returns error for `eip155:1337` → tab hidden                   |

## What DOES Work (And Why)

| Feature                        | Why It Works                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| ETH balance                    | `AccountTrackerController.refresh()` → direct `eth_getBalance` RPC, no chain gating                     |
| Manual custom token import     | `AddCustomToken.tsx` → direct `getERC20TokenDecimals/Symbol/Name` RPC calls, no allowlist               |
| Token balances after import    | `TokenBalancesController.updateBalances()` → direct multicall RPC                                       |
| Asset watcher (dapp-triggered) | `TestDApp.tapAddERC20TokenToWalletButton()` triggers `wallet_watchAsset`, which also bypasses detection |

---

## E2E Test Pattern (Canonical)

From `tests/regression/assets/import-custom-token.spec.ts`:

```typescript
await withFixtures(
  {
    fixture: ({ localNodes }) => {
      const rpcPort = localNodes?.[0]?.getPort() ?? AnvilPort();
      return new FixtureBuilder().withNetworkController({
        chainId: '0x539',
        rpcUrl: `http://localhost:${rpcPort}`,
        type: 'custom',
        nickname: 'Local RPC',
        ticker: 'ETH',
      });
    },
    restartDevice: true,
    smartContracts: [SMART_CONTRACTS.HST],
  },
  async ({ contractRegistry }) => {
    const hstAddress = await contractRegistry?.getContractAddress(
      SMART_CONTRACTS.HST,
    );
    await loginToApp();
    await WalletView.tapImportTokensButton();
    await ImportTokensView.typeTokenAddress(hstAddress);
    await new Promise((resolve) => setTimeout(resolve, 20000)); // direct RPC metadata fetch
    await Assertions.expectElementToHaveText(
      ImportTokensView.symbolInput,
      'TST',
    );
    await ImportTokensView.tapOnNextButton('Import Token');
    await ConfirmAddAssetView.tapOnConfirmButton();
    await Assertions.expectElementToBeVisible(
      WalletView.tokenInWallet('100 TST'),
    );
  },
);
```

The 20-second `setTimeout` is required because it takes time for the app to complete the direct RPC metadata fetch from Anvil before the UI can be asserted.

---

## Anvil E2E Infrastructure (Reference)

### Startup

| File                            | Role                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `scripts/speculos-env.sh`       | Shell script: starts Anvil with `--chain-id 1337 --port 8545 --mnemonic <seed> --balance 1000` |
| `tests/seeder/anvil-manager.ts` | TS manager: uses `@viem/anvil`, default config chainId 1337, hardfork 'prague', port 8545      |
| `tests/seeder/anvil-seeder.ts`  | Deploys ERC20/NFT contracts via viem clients before tests                                      |
| `tests/seeder/anvil-clients.ts` | Provider clients for interacting with Anvil                                                    |

### Network Configuration

| File                                       | Role                                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `tests/framework/fixtures/FixtureUtils.ts` | Port management, adb reverse for Android, launch args for iOS               |
| `tests/resources/mock-configs.ts`          | Provider configs with `chainId: '0x539'`, `rpcUrl: 'http://localhost:8545'` |
| `tests/flows/wallet.flow.ts`               | UI flow: `addLocalhostNetwork()` enters chain ID `1337`, RPC URL, symbol    |

### Key Constants

- Chain ID: `1337` (decimal) / `0x539` (hex)
- Default port: `8545`
- Mnemonic: configurable, supports 12 and 24-word seeds
- Default balance: 1000 ETH per account
- Hardfork: `prague` (Anvil manager) / `muirGlacier` (contract deployment)

---

## AccountTrackerController: Triggering Balance Queries on Chain 1337

### Why It Works (No Chain Gating in the Controller)

`AccountTrackerController.refresh()` is **chain-agnostic**. It accepts any `networkClientId[]` and fetches `eth_getBalance` for all of them via their RPC providers. There is zero chain ID filtering inside the controller.

```
AccountTrackerController.refresh([networkClientId])
    ↓
_refreshAccounts({ networkClientIds })
    ↓  maps each networkClientId → { chainId, provider, ethQuery }
_getCorrectNetworkClient(networkClientId)
    ↓
NetworkController.getNetworkClientById(networkClientId)
    ↓  returns { configuration: { chainId }, provider, blockTracker }
    ↓  NO CHAIN GATING — every networkClientId is resolved and queried
    ↓
_syncAccounts — calls eth_getBalance via provider directly to Anvil
```

**File:** `node_modules/@metamask/assets-controllers/dist/AccountTrackerController.mjs`

### Where the Chain Filtering Actually Happens

The chain gating is **not in AccountTrackerController**. It's in three callers that all filter by "popular" or "enabled" networks before passing networkClientIds to `refresh()`:

| Caller                                          | File                                                                 | Filter                                                       | Why 1337 Excluded    |
| ----------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------- |
| `useBalanceRefresh` (pull-to-refresh)           | `app/components/Views/Wallet/hooks/useBalanceRefresh.ts:28`          | `useNetworkEnablement().popularEvmNetworks`                  | Not in `PopularList` |
| `performEvmRefresh` (programmatic)              | `app/components/UI/Tokens/util/tokenRefreshUtils.ts:102-108`         | `NetworkEnablementController.state.enabledNetworkMap.eip155` | May not be enabled   |
| `useAccountTrackerPolling` (background polling) | `app/components/hooks/AssetPolling/useAccountTrackerPolling.ts:9-12` | `usePollingNetworks()` → `selectEVMEnabledNetworks`          | May not be enabled   |

### Caller 1 — `useBalanceRefresh` (Pull-to-Refresh)

**File:** `app/components/Views/Wallet/hooks/useBalanceRefresh.ts`

```typescript
const { popularEvmNetworks: evmChainIds } = useNetworkEnablement();

const evmNetworkConfigurationsFiltered = useMemo(() => {
  const allowed = new Set<string>(evmChainIds); // ← only popular chains
  return Object.fromEntries(
    Object.entries(evmNetworkConfigurations).filter(([chainId]) =>
      allowed.has(chainId),
    ),
  );
}, [evmNetworkConfigurations, evmChainIds]);

// Only passes networkClientIds for popular chains to refresh
const networkClientIds = Object.values(evmNetworkConfigurationsFiltered)
  .map(
    ({ defaultRpcEndpointIndex, rpcEndpoints }) =>
      rpcEndpoints[defaultRpcEndpointIndex]?.networkClientId,
  )
  .filter(Boolean);

AccountTrackerController.refresh(networkClientIds);
```

### Caller 2 — `performEvmRefresh` (Programmatic Token Refresh)

**File:** `app/components/UI/Tokens/util/tokenRefreshUtils.ts:85-129`

```typescript
export const performEvmRefresh = async (
  evmNetworkConfigurationsByChainId,
  nativeCurrencies,
) => {
  const chainIds = Object.entries(
    NetworkEnablementController.state.enabledNetworkMap[
      KnownCaipNamespace.Eip155
    ] || {},
  )
    .filter(([, isEnabled]) => isEnabled === true) // ← only enabled chains
    .map(([chainId]) => chainId);

  const networkClientIds = chainIds
    .map(
      (c) =>
        networkConfigurations[c]?.rpcEndpoints?.[
          networkConfigurations[c]?.defaultRpcEndpointIndex
        ]?.networkClientId,
    )
    .filter(Boolean);

  await AccountTrackerController.refresh(networkClientIds); // ← 1337 filtered out above
};
```

### Caller 3 — `useAccountTrackerPolling` (Background Polling)

**File:** `app/components/hooks/AssetPolling/useAccountTrackerPolling.ts`

```typescript
const useAccountTrackerPolling = ({ networkClientIds } = {}) => {
  const pollingNetworks = usePollingNetworks(); // ← returns enabled EVM networks only
  const pollingNetworkClientIds = pollingNetworks
    .map((c) => c?.rpcEndpoints?.[c?.defaultRpcEndpointIndex]?.networkClientId)
    .filter(Boolean);

  const pollingInput =
    pollingNetworkClientIds.length > 0
      ? [{ networkClientIds: pollingNetworkClientIds }]
      : [];

  // If an override is passed, use it instead
  let overridePollingInput;
  if (networkClientIds) {
    overridePollingInput = [{ networkClientIds }]; // ← override skips filtering
  }

  const input = overridePollingInput ?? pollingInput;

  usePolling({
    startPolling: AccountTrackerController.startPolling.bind(
      AccountTrackerController,
    ),
    stopPollingByPollingToken:
      AccountTrackerController.stopPollingByPollingToken.bind(
        AccountTrackerController,
      ),
    input,
  });
};
```

### How to Query Balances on Chain 1337 Directly

All three approaches bypass the caller-level filters and call `refresh()` directly with the Anvil chain's `networkClientId`.

#### Approach 1: Production Pattern (from `Engine.ts:752-760`)

```typescript
const { AccountTrackerController, NetworkController } = Engine.context;

try {
  const networkClientId =
    NetworkController.findNetworkClientIdByChainId('0x539');
  await AccountTrackerController.refresh([networkClientId]);
} catch {
  // Chain 1337 not configured in NetworkController — skip
}
```

#### Approach 2: From `networkConfigurationsByChainId` (Fixture-Safe)

```typescript
const { AccountTrackerController, NetworkController } = Engine.context;

const networkConfig =
  NetworkController.state.networkConfigurationsByChainId['0x539'];
if (networkConfig) {
  const networkClientId =
    networkConfig.rpcEndpoints[networkConfig.defaultRpcEndpointIndex]
      ?.networkClientId;
  if (networkClientId) {
    await AccountTrackerController.refresh([networkClientId]);
  }
}
```

#### Approach 3: Full Single-Chain Refresh (From `Engine.ts:745-760`)

Refreshes account balance + token balances for one chain:

```typescript
const { AccountTrackerController, TokenBalancesController, NetworkController } =
  Engine.context;
const hexChainId = '0x539';

// Token balances (TokenBalancesController has no chain gating)
await TokenBalancesController.updateBalances({ chainIds: [hexChainId] });

// Account ETH balance
try {
  const networkClientId =
    NetworkController.findNetworkClientIdByChainId(hexChainId);
  await AccountTrackerController.refresh([networkClientId]);
} catch {
  // chain not configured
}
```

### Behavior After Refresh

After `AccountTrackerController.refresh([networkClientIdFor1337])` completes:

- `AccountTrackerController.state.accountsByChainId['0x539'][address]` is populated with `{ balance: '0x...' }`
- The wallet UI reads from this state via selectors like `getAccountTrackerControllerAccountsByChainId`
- Token balances are stored separately in `TokenBalancesController.state`

**This is not a mock.** The controller makes a real `eth_getBalance` RPC call to Anvil on `localhost:8545`.

### How to Include Chain 1337 in Background Polling (Override)

To make `useAccountTrackerPolling` poll the Anvil chain automatically without caller filtering:

```typescript
// In your component:
useAccountTrackerPolling({
  networkClientIds: ['the-network-client-id-for-0x539'],
});
```

When `networkClientIds` is passed as an override, the hook ignores `usePollingNetworks()` and polls those networkClientIds directly.

### Prerequisites

For any of these approaches to work, the Anvil network **must be configured** in `NetworkController`:

```typescript
// In the fixture or before calling refresh():
new FixtureBuilder().withNetworkController({
  chainId: '0x539',
  rpcUrl: `http://localhost:${anvilPort}`,
  type: 'custom',
  nickname: 'Local RPC',
  ticker: 'ETH',
});
```

This creates a `networkConfigurationsByChainId['0x539']` entry with a valid `networkClientId`, which is all `AccountTrackerController.refresh()` needs.
