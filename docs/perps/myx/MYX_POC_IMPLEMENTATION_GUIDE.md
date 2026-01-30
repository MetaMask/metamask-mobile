# MYX POC Re-implementation Guide

## Executive Summary

The MYX POC was implemented with ~4,400 lines of production code across 8 files. This document captures all learnings, issues, and solutions discovered during the POC to enable efficient re-implementation on the updated main branch (with protocol aggregation and core migration preparation).

---

## 1. File Structure to Create

```
app/components/UI/Perps/
├── controllers/providers/
│   └── MYXProvider.ts              # Main IPerpsProvider implementation (~1,400 lines)
├── services/
│   ├── MYXClientService.ts         # SDK client lifecycle & connection (~1,600 lines)
│   ├── MYXWalletService.ts         # MetaMask wallet signing adapter (~250 lines)
│   └── MYXSubscriptionService.ts   # WebSocket subscriptions & polling (~1,100 lines)
├── types/
│   └── myx-types.ts                # SDK type re-exports & custom types (~230 lines)
├── constants/
│   └── myxConfig.ts                # Configuration, endpoints, conversions (~370 lines)
└── utils/
    └── myxAdapter.ts               # Type transformations MetaMask ↔ MYX (~200 lines)
```

---

## 2. Critical Implementation Lessons

### 2.1 Authentication - THE BIGGEST CHALLENGE

**Issue**: MYX SDK's `subscription.auth()` method fails with 9401 even when tokens are valid.

**Root Cause**: The SDK's internal authentication flow has a bug where it doesn't properly send credentials over the WebSocket connection.

**Solution**: Bypass SDK auth and implement manual WebSocket authentication.

```typescript
// ❌ DON'T do this - SDK auth is broken
await client.subscription.auth(); // Returns 9401 Unauthorized

// ✅ DO this - manual WebSocket signin
const ws = new WebSocket('wss://oapi-beta.myx.finance/ws');
ws.send(JSON.stringify({ request: 'signin', args: `sdk.${accessToken}` }));
// Wait for code 9200 response before subscribing to private channels
```

**Token Generation**: MYX requires tokens from their backend API, NOT client-generated signatures.

```typescript
// Token generation endpoint
const endpoint =
  'https://api-beta.myx.finance/openapi/gateway/auth/api_key/create_token';

// Signature generation
const timestamp = Date.now();
const expireTime = timestamp + 86400000; // 24 hours
const message = `${appId}&${timestamp}&${expireTime}&${address}&${secret}`;
const signature = sha256(message); // Use react-native-quick-crypto

// Request body
const body = {
  address,
  appId,
  timestamp,
  expireTime,
  sign: signature,
};

// Response contains accessToken and refreshToken
```

**Credentials**:

- **Testnet**: `appId='metamask'`, `secret='vcVSelUYUfcepmOKGemyfC0dcxQDhCg1'`
- **Mainnet**: NOT YET AVAILABLE - Blocks production release. Must obtain from MYX team.

### 2.2 Signing Method

**Issue**: Task showed `signTypedMessage` expects typed data array, not plain strings. MYX wallet adapter passes string messages.

**Solution**: Use `signPersonalMessage` for MYX wallet adapter.

```typescript
// MYXWalletService.ts - createSignerAdapter()
signMessage: async (message: string | Uint8Array): Promise<string> => {
  const currentAddress = await this.getCurrentAddress();

  // Convert message to hex format
  const messageBytes =
    typeof message === 'string' ? Buffer.from(message) : Buffer.from(message);
  const hexMessage = `0x${messageBytes.toString('hex')}`;

  // ✅ Use signPersonalMessage, NOT signTypedMessage
  const signature = await this.deps.controllers.keyring.signPersonalMessage({
    from: currentAddress,
    data: hexMessage,
  });

  return signature;
};
```

### 2.3 Multi-Pool Model

**Key Difference**: MYX uses Multi-Pool Model vs HyperLiquid's single pool.

Each trading pair belongs to a specific pool, and operations must specify the correct poolId.

```typescript
// Build symbol → poolId mappings at initialization
private poolsCache: MYXPoolSymbol[] = [];
private symbolToPoolId = new Map<string, string>();
private poolIdToSymbol = new Map<string, string>();

async initializePoolMappings(): Promise<void> {
  const markets = await this.client.markets.getPoolSymbolAll();

  for (const market of markets) {
    this.poolsCache.push(market);
    this.symbolToPoolId.set(market.symbol, market.poolId);
    this.poolIdToSymbol.set(market.poolId, market.symbol);
  }
}

// When routing orders, ALWAYS select pool by symbol first
async getPoolIdForSymbol(symbol: string): Promise<string> {
  const poolId = this.symbolToPoolId.get(symbol);
  if (!poolId) {
    throw new Error(`Unknown symbol: ${symbol}. Pool mapping not found.`);
  }
  return poolId;
}
```

### 2.4 WebSocket Subscription Reliability

**Issue**: SDK WebSocket callbacks are unreliable for private data (positions, orders).

**Observed Behavior**:

- Price ticker callbacks sometimes stop firing
- Position updates don't arrive consistently
- Order status changes are missed

**Solution**: Use REST polling as primary data source, WebSocket as optimization hint.

```typescript
// MYXSubscriptionService.ts

// For positions: REST poll every 5 seconds
private positionPollingInterval: NodeJS.Timeout | null = null;
private readonly POSITION_POLL_INTERVAL_MS = 5000;

async startPositionPolling(callback: (positions: Position[]) => void): Promise<void> {
  // Initial fetch
  const positions = await this.fetchPositionsViaREST();
  callback(positions);

  // Continuous polling
  this.positionPollingInterval = setInterval(async () => {
    try {
      const positions = await this.fetchPositionsViaREST();
      callback(positions);
    } catch (error) {
      // Use cached data on error
      if (this.cachedPositions.length > 0) {
        callback(this.cachedPositions);
      }
    }
  }, this.POSITION_POLL_INTERVAL_MS);
}

// For prices: REST poll every 2 seconds (SDK ticker callback unreliable)
private readonly PRICE_POLL_INTERVAL_MS = 2000;
```

### 2.5 Decimal Formats

MYX uses different decimal formats than HyperLiquid:

| Data Type  | MYX Decimals | HyperLiquid Decimals |
| ---------- | ------------ | -------------------- |
| Price      | 30 decimals  | Human-readable       |
| Size       | 18 decimals  | Human-readable       |
| Collateral | 18 decimals  | Human-readable       |

```typescript
// myxConfig.ts conversion helpers
import { BigNumber } from 'bignumber.js';

const PRICE_DECIMALS = 30;
const SIZE_DECIMALS = 18;
const COLLATERAL_DECIMALS = 18;

// Human-readable → MYX format
export function toMYXPrice(price: string): string {
  return new BigNumber(price).shiftedBy(PRICE_DECIMALS).toFixed(0);
}

export function toMYXSize(size: string): string {
  return new BigNumber(size).shiftedBy(SIZE_DECIMALS).toFixed(0);
}

export function toMYXCollateral(amount: string): string {
  return new BigNumber(amount).shiftedBy(COLLATERAL_DECIMALS).toFixed(0);
}

// MYX format → Human-readable
export function fromMYXPrice(price: string): string {
  return new BigNumber(price).shiftedBy(-PRICE_DECIMALS).toString();
}

export function fromMYXSize(size: string): string {
  return new BigNumber(size).shiftedBy(-SIZE_DECIMALS).toString();
}

export function fromMYXCollateral(amount: string): string {
  return new BigNumber(amount).shiftedBy(-COLLATERAL_DECIMALS).toString();
}
```

### 2.6 Direction & Operation Mapping

MYX separates orders by direction + operation (vs HyperLiquid's signed size approach):

```typescript
// MetaMask order intent → MYX SDK method mapping

// Opening positions
buy + no existing position  → createIncreaseOrder + MYXDirection.LONG
sell + no existing position → createIncreaseOrder + MYXDirection.SHORT

// Increasing positions
buy + existing long         → createIncreaseOrder + MYXDirection.LONG
sell + existing short       → createIncreaseOrder + MYXDirection.SHORT

// Reducing/closing positions
sell + existing long        → createDecreaseOrder + MYXDirection.LONG
buy + existing short        → createDecreaseOrder + MYXDirection.SHORT

// Implementation
function mapOrderToMYX(
  isBuy: boolean,
  existingPosition: Position | null
): { method: 'increase' | 'decrease'; direction: MYXDirection } {
  const hasPosition = existingPosition !== null;
  const isLong = existingPosition?.direction === 'long';

  if (!hasPosition) {
    // Opening new position
    return {
      method: 'increase',
      direction: isBuy ? MYXDirection.LONG : MYXDirection.SHORT,
    };
  }

  if (isBuy) {
    // Buying: increase long OR close short
    return isLong
      ? { method: 'increase', direction: MYXDirection.LONG }
      : { method: 'decrease', direction: MYXDirection.SHORT };
  } else {
    // Selling: close long OR increase short
    return isLong
      ? { method: 'decrease', direction: MYXDirection.LONG }
      : { method: 'increase', direction: MYXDirection.SHORT };
  }
}
```

---

## 3. SDK Blockers (Cannot Implement Until MYX Provides)

### P0 - Critical (Blocks Core Features)

| Feature            | SDK Status      | Impact                                     | Workaround               |
| ------------------ | --------------- | ------------------------------------------ | ------------------------ |
| Order Fill History | No API endpoint | Cannot show trade execution history        | None - must wait for MYX |
| Funding History    | No API endpoint | Cannot show funding payments received/paid | None - must wait for MYX |

### P1 - Important (Degrades UX)

| Feature                 | SDK Status           | Impact                           | Workaround               |
| ----------------------- | -------------------- | -------------------------------- | ------------------------ |
| Order Book Depth        | No WebSocket channel | Cannot display order book        | Could poll REST but slow |
| Real-time Account State | No WebSocket channel | Account values may be stale      | Derive from positions    |
| OI Caps                 | No API endpoint      | Cannot show open interest limits | Omit from UI             |

### P2 - Nice-to-Have

| Feature                 | SDK Status           | Impact                             | Workaround        |
| ----------------------- | -------------------- | ---------------------------------- | ----------------- |
| Historical Portfolio    | No API endpoint      | Cannot show portfolio value charts | Omit from UI      |
| Order Fill Subscription | No WebSocket channel | Must poll for fills                | REST polling      |
| Trade History           | Limited API          | Only recent trades available       | Accept limitation |

---

## 4. Configuration Required

### 4.0 CRITICAL: Hardcoded Testnet Mode

**MYX is hardcoded to ALWAYS use testnet regardless of app-wide perps environment setting.**

**Why This Matters**:

- MetaMask developers typically use **mainnet** for HyperLiquid testing (real markets, liquidity)
- When switching to MYX, the provider silently uses **testnet** even if `perps.isTestnet = false`
- This allows parallel development without needing MYX mainnet credentials

**Implementation Pattern** (from POC):

```typescript
// MYXClientService.ts constructor
constructor(deps, options = {}) {
  // FORCE TESTNET - we only have testnet credentials (appId=metamask)
  // The SDK's internal auth fails with 9401, but manual WS auth works on testnet
  const _requestedTestnet = options.isTestnet; // Preserved for when mainnet credentials available
  this.isTestnet = true; // Override any passed option until mainnet credentials available

  this.config = {
    chainId: BNB_CHAIN_IDS.testnet, // Always testnet for now
    brokerAddress: options.brokerAddress || '',
    isTestnet: true,
  };

  this.deps.debugLogger.log('[MYXClientService] Initialized (TESTNET FORCED)', {
    requestedTestnet: options.isTestnet,
    actualTestnet: this.isTestnet,
  });
}
```

**When to Remove This Hardcode**:

1. MYX provides mainnet credentials (appId + secret)
2. Verify mainnet endpoints work: `https://api.myx.finance`, `wss://oapi.myx.finance/ws`
3. Test manual WebSocket auth on mainnet
4. Update config to respect `options.isTestnet` parameter

**Reference**: See archived POC branch `feat/perps/myx-integration` for full implementation.

---

### 4.1 Chain IDs

```typescript
// myxConfig.ts
export const MYX_CHAIN_IDS = {
  testnet: 97, // BNB Smart Chain Testnet
  mainnet: 56, // BNB Smart Chain Mainnet
} as const;

export type MYXChainId = (typeof MYX_CHAIN_IDS)[keyof typeof MYX_CHAIN_IDS];
```

### 4.2 Endpoints

```typescript
// myxConfig.ts
export const MYX_ENDPOINTS = {
  testnet: {
    rest: 'https://api-beta.myx.finance',
    websocket: 'wss://oapi-beta.myx.finance/ws',
    auth: 'https://api-beta.myx.finance/openapi/gateway/auth/api_key/create_token',
  },
  mainnet: {
    rest: 'https://api.myx.finance', // TBD - needs verification with MYX
    websocket: 'wss://oapi.myx.finance/ws', // TBD - needs verification with MYX
    auth: 'https://api.myx.finance/openapi/gateway/auth/api_key/create_token', // TBD
  },
} as const;
```

### 4.3 Feature Flag

```typescript
// perpsConfig.ts
export const PROVIDER_CONFIG = {
  HYPERLIQUID_ENABLED: true,
  MYX_ENABLED: true, // Set false to disable MYX provider
};

// In PerpsController initialization
if (PROVIDER_CONFIG.MYX_ENABLED) {
  this.registerProvider('myx', new MYXProvider(deps));
}
```

### 4.4 Supported Markets

```typescript
// myxConfig.ts
// MYX testnet supported markets (as of POC)
export const MYX_SUPPORTED_SYMBOLS = [
  'BTC',
  'ETH',
  'BNB',
  // Add more as MYX enables them
] as const;
```

---

## 5. Lazy Initialization Pattern (CRITICAL)

Must defer SDK initialization to first API call to avoid `Engine.context` timing issues.

**Problem**: If MYXProvider initializes in constructor, it may access `Engine.context` before the Engine is fully initialized, causing crashes.

**Solution**: Lazy initialization on first use.

```typescript
// MYXProvider.ts
export class MYXProvider implements IPerpsProvider {
  private deps: PlatformDependencies;
  private clientService: MYXClientService;
  private walletService: MYXWalletService;
  private subscriptionService: MYXSubscriptionService;

  private clientsInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(options: MYXProviderOptions) {
    // Store dependencies only - NO initialization
    this.deps = options.platformDependencies;
    this.clientService = new MYXClientService(this.deps);
    this.walletService = new MYXWalletService(this.deps);
    this.subscriptionService = new MYXSubscriptionService(this.clientService);
  }

  // Called by EVERY public method before doing work
  private async ensureClientsInitialized(): Promise<void> {
    if (this.clientsInitialized) {
      return;
    }

    // Prevent concurrent initialization
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    this.initializationPromise = this.doInitialize();
    await this.initializationPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      const signer = this.walletService.createSignerAdapter();
      await this.clientService.initialize(signer);
      this.clientsInitialized = true;
    } catch (error) {
      this.initializationPromise = null; // Allow retry
      throw error;
    }
  }

  // Example public method
  async getMarkets(): Promise<MarketInfo[]> {
    await this.ensureClientsInitialized();
    return this.clientService.getMarkets();
  }
}
```

---

## 6. Graceful Degradation

When auth fails or SDK methods fail, fall back gracefully to maintain UX.

```typescript
// MYXSubscriptionService.ts
async subscribeToPositions(
  callback: (positions: Position[]) => void
): Promise<() => void> {
  try {
    await this.ensureAuthentication();
    return this.startPositionPolling(callback);
  } catch (error) {
    console.warn('MYX: Auth failed for positions, using cached data', error);

    // Return cached data if available
    if (this.cachedPositions.length > 0) {
      callback(this.cachedPositions);
    } else {
      callback([]); // Empty but valid response
    }

    // Return no-op unsubscribe
    return () => undefined;
  }
}

// MYXProvider.ts - handling missing features
async getOrderFillHistory(): Promise<OrderFill[]> {
  // SDK doesn't support this - return empty array gracefully
  console.warn('MYX: Order fill history not available');
  return [];
}

async getFundingHistory(): Promise<FundingPayment[]> {
  // SDK doesn't support this - return empty array gracefully
  console.warn('MYX: Funding history not available');
  return [];
}
```

---

## 7. Package Dependencies

### Required (add to package.json)

```json
{
  "dependencies": {
    "@myx-trade/sdk": "^0.1.247"
  }
}
```

### Already Available (use existing)

- `react-native-quick-crypto` - SHA256 for token signature generation
- `axios` - HTTP requests for REST API
- `bignumber.js` - Decimal arithmetic for conversions

---

## 8. Error Handling Patterns

### SDK Error Codes

```typescript
// myxConfig.ts
export const MYX_ERROR_CODES = {
  // WebSocket auth
  WS_SUCCESS: 9200,
  WS_UNAUTHORIZED: 9401,

  // API errors
  INVALID_SIGNATURE: 1001,
  INSUFFICIENT_BALANCE: 2001,
  POSITION_NOT_FOUND: 3001,
  ORDER_NOT_FOUND: 3002,
  INVALID_LEVERAGE: 4001,
  EXCEEDS_MAX_POSITION: 4002,
} as const;
```

### Error Translation

```typescript
// myxAdapter.ts
export function translateMYXError(error: unknown): PerpsError {
  if (error instanceof Error) {
    const message = error.message;

    if (message.includes('9401') || message.includes('Unauthorized')) {
      return new PerpsError(
        'AUTHENTICATION_FAILED',
        'MYX authentication failed. Please reconnect.',
      );
    }

    if (message.includes('insufficient') || message.includes('2001')) {
      return new PerpsError(
        'INSUFFICIENT_BALANCE',
        'Insufficient balance for this operation.',
      );
    }

    if (message.includes('leverage') || message.includes('4001')) {
      return new PerpsError('INVALID_LEVERAGE', 'Invalid leverage value.');
    }
  }

  return new PerpsError('UNKNOWN', 'An unknown error occurred with MYX.');
}
```

---

## 9. Testing Strategy

### Unit Tests

```typescript
// MYXProvider.test.ts
describe('MYXProvider', () => {
  describe('getMarkets', () => {
    it('should transform MYX markets to MarketInfo format', async () => {
      // Mock SDK response
      mockClientService.getMarkets.mockResolvedValue([
        { symbol: 'BTC', poolId: '1', ... }
      ]);

      const markets = await provider.getMarkets();

      expect(markets[0]).toMatchObject({
        symbol: 'BTC',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
      });
    });
  });

  describe('placeOrder', () => {
    it('should map buy order to increase long', async () => {
      await provider.placeOrder({
        symbol: 'BTC',
        isBuy: true,
        size: '0.1',
        // ...
      });

      expect(mockClientService.createIncreaseOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: MYXDirection.LONG,
        })
      );
    });
  });
});
```

### Integration Tests (Testnet)

```typescript
// MYXIntegration.test.ts
describe('MYX Integration (Testnet)', () => {
  beforeAll(async () => {
    // Use testnet credentials
    process.env.MYX_APP_ID = 'metamask';
    process.env.MYX_SECRET = 'vcVSelUYUfcepmOKGemyfC0dcxQDhCg1';
  });

  it('should fetch markets from testnet', async () => {
    const provider = new MYXProvider({ ... });
    const markets = await provider.getMarkets();

    expect(markets.length).toBeGreaterThan(0);
    expect(markets.some(m => m.symbol === 'BTC')).toBe(true);
  });
});
```

---

## 10. Re-implementation Checklist

### Phase 1: Core Structure (Day 1-2)

- [ ] Create `myx-types.ts` with SDK type re-exports
- [ ] Create `myxConfig.ts` with endpoints, chain IDs, decimal helpers
- [ ] Create `MYXWalletService.ts` with signer adapter (use signPersonalMessage)
- [ ] Write unit tests for config and wallet service

### Phase 2: Client Service (Day 3-4)

- [ ] Create `MYXClientService.ts` with lazy init pattern
- [ ] Implement token generation from MYX Auth API
- [ ] Implement manual WebSocket authentication (bypass SDK auth bug)
- [ ] Implement health check monitoring
- [ ] Write unit tests for client service

### Phase 3: Subscription Service (Day 5-6)

- [ ] Create `MYXSubscriptionService.ts`
- [ ] Implement REST polling fallback for positions/orders
- [ ] Implement price subscriptions with caching
- [ ] Implement candle subscriptions
- [ ] Write unit tests for subscription service

### Phase 4: Provider (Day 7-9)

- [ ] Create `MYXProvider.ts` implementing IPerpsProvider
- [ ] Implement all required interface methods:
  - [ ] `connect()` / `disconnect()`
  - [ ] `getMarkets()`
  - [ ] `getAccountState()`
  - [ ] `getPositions()` / `subscribeToPositions()`
  - [ ] `getOrders()` / `subscribeToOrders()`
  - [ ] `placeOrder()` / `cancelOrder()` / `editOrder()`
  - [ ] `closePosition()` / `closePositions()`
  - [ ] `updateMargin()`
  - [ ] `updatePositionTPSL()`
  - [ ] `calculateFees()`
  - [ ] `subscribeToPrices()` / `subscribeToCandles()`
- [ ] Add graceful degradation for missing SDK features
- [ ] Write unit tests for all methods

### Phase 5: Adapters (Day 10)

- [ ] Create `myxAdapter.ts` for type transformations
- [ ] Handle direction/operation mapping
- [ ] Handle decimal conversions
- [ ] Handle error translation
- [ ] Write unit tests for adapters

### Phase 6: Integration (Day 11-12)

- [ ] Add to PerpsController provider registration
- [ ] Add feature flag configuration
- [ ] Test full flow with testnet
- [ ] Document any new issues discovered

---

## 11. Known Issues & Workarounds Summary

| Issue                                  | Workaround                             | Permanent Fix Needed |
| -------------------------------------- | -------------------------------------- | -------------------- |
| SDK `subscription.auth()` returns 9401 | Manual WebSocket signin                | MYX SDK fix          |
| WebSocket position updates unreliable  | REST polling every 5s                  | MYX SDK fix          |
| WebSocket price updates unreliable     | REST polling every 2s                  | MYX SDK fix          |
| No order fill history API              | Return empty array                     | MYX API addition     |
| No funding history API                 | Return empty array                     | MYX API addition     |
| Mainnet credentials unavailable        | **Hardcode testnet** (see section 4.0) | Obtain from MYX      |

**Note on Testnet Hardcoding**: MYX is forced to testnet even when app perps env is mainnet. This lets developers test MYX alongside HyperLiquid mainnet. See section 4.0 for details.

---

## 12. Archived POC Branch Reference

The original MYX POC implementation is preserved in the branch:

```
feat/perps/myx-integration
```

**To reference the POC code:**

```bash
git log feat/perps/myx-integration --oneline -20
git diff main...feat/perps/myx-integration -- app/components/UI/Perps/
```

**Key files to reference:**

- `app/components/UI/Perps/services/MYXClientService.ts` (~1,600 lines)
- `app/components/UI/Perps/controllers/providers/MYXProvider.ts` (~1,400 lines)
- `app/components/UI/Perps/services/MYXSubscriptionService.ts` (~1,100 lines)
- `app/components/UI/Perps/constants/myxConfig.ts` (~370 lines)

**Note**: The POC branch contains additional debug screens and experimental code not needed for production. Use it as reference for the core implementation patterns.

---

## 13. Contact & Support

For MYX SDK issues or API questions:

- MYX Developer Discord: [TBD]
- MYX API Documentation: [TBD]
- MetaMask integration contact: [TBD]

---

_Last Updated: January 2026_
_POC Implementation Date: January 2026_
_POC Branch: `feat/perps/myx-integration`_
_Document Version: 1.1_
