# HIP-3 Implementation Reference

**Last Updated**: 2025-01-28
**Status**: Production (Feature Flag Controlled)

## 1. Overview

This document provides a comprehensive reference for how MetaMask implements support for HyperLiquid's HIP-3 (builder-deployed perpetuals) protocol. HIP-3 enables builders to deploy custom perpetuals DEXs on HyperLiquid by staking 500k HYPE tokens.

### Key HIP-3 Characteristics

- **Isolated Margin Only**: HIP-3 DEXs use isolated margin mode
- **Separate Orderbooks**: Each DEX maintains independent orderbooks and liquidity
- **Global Asset IDs**: Unique asset ID formula enables seamless routing across DEXs
- **Settlement Authority**: Deployers have settlement authority for their markets
- **Open Interest Caps**: Per-DEX and per-asset caps to manage risk

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PerpsController                         │
│              (Protocol-Agnostic Layer)                      │
│  - No HIP-3-specific code                                   │
│  - Injects feature flags to provider                        │
└────────────────────┬────────────────────────────────────────┘
                     │ IPerpsProvider Interface
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  HyperLiquidProvider                        │
│             (Protocol Implementation)                       │
│  - Feature flags: equityEnabled, enabledDexs                │
│  - Asset mapping with DEX prefixes                          │
│  - Balance management (native/programmatic)                 │
│  - Auto-transfer for HIP-3 orders                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           HyperLiquidSubscriptionService                    │
│              (WebSocket Management)                         │
│  - webData2: Main DEX (positions, orders, account)          │
│  - clearinghouseState: HIP-3 DEXs (positions, account)      │
│  - assetCtxs: Per-DEX market data                           │
│  - Data aggregation with change detection                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  hyperLiquidAdapter                         │
│              (Type Transformations)                         │
│  - Asset ID calculation                                     │
│  - Asset name parsing (dex:SYMBOL format)                   │
│  - SDK ↔ Protocol-agnostic type conversion                  │
└─────────────────────────────────────────────────────────────┘
```

## 3. Key Implementation Decisions

### 3.1 Feature Flag System

**Location**: `HyperLiquidProvider.ts:158-163`

```typescript
private equityEnabled: boolean;        // Kill switch for all HIP-3 features
private enabledDexs: string[];         // Whitelist of allowed HIP-3 DEXs
private useDexAbstraction: boolean;    // Native balance abstraction mode
```

**Decision Rationale**:

- **Staged Rollout**: Enables gradual feature deployment
- **Risk Management**: Kill switch for quick disablement if issues arise
- **Whitelist Mode**: Granular control over which HIP-3 DEXs are exposed
- **Balance Strategy Toggle**: Allows switching between native and programmatic balance management

**Configuration Injection**:

```typescript
// PerpsController.ts:633-648
constructor({ clientConfig }: PerpsControllerOptions) {
  // Store HIP-3 configuration (immutable after construction)
  this.equityEnabled = clientConfig.equityEnabled ?? false;
  this.enabledDexs = [...(clientConfig.enabledDexs ?? [])];
  // Passes to provider without direct HIP-3 knowledge
}
```

### 3.2 Asset ID Calculation

**Location**: `hyperLiquidAdapter.ts:456-468`, `hyperLiquidConfig.ts:231-239`

```typescript
export function calculateHip3AssetId(
  perpDexIndex: number,
  indexInMeta: number,
): number {
  if (perpDexIndex === 0) {
    return indexInMeta; // Main DEX: direct index (0, 1, 2, ...)
  }
  return (
    HIP3_ASSET_ID_CONFIG.BASE_ASSET_ID + // 100000
    perpDexIndex * HIP3_ASSET_ID_CONFIG.DEX_MULTIPLIER + // 10000
    indexInMeta
  );
}
```

**Formula Breakdown**:

- **Main DEX** (perpDexIndex=0): `assetId = index` (BTC=0, ETH=1, SOL=2, ...)
- **xyz DEX** (perpDexIndex=1): `assetId = 100000 + (1 × 10000) + index` = 110000-110999
- **abc DEX** (perpDexIndex=2): `assetId = 100000 + (2 × 10000) + index` = 120000-120999

**Decision Rationale**:

- **Global Uniqueness**: Each asset across all DEXs has a unique ID
- **Scalability**: Supports up to 10 HIP-3 DEXs with 10,000 assets each
- **Seamless Routing**: Order placement doesn't require explicit DEX parameters
- **Backward Compatible**: Main DEX asset IDs unchanged (direct index)

**Example Calculation**:

```
Main DEX BTC:    perpDexIndex=0, index=0  → assetId = 0
Main DEX ETH:    perpDexIndex=0, index=1  → assetId = 1
xyz TSLA:        perpDexIndex=1, index=0  → assetId = 110000
xyz NVDA:        perpDexIndex=1, index=1  → assetId = 110001
abc GOLD:        perpDexIndex=2, index=0  → assetId = 120000
```

### 3.3 Asset Naming Convention

**Location**: `hyperLiquidAdapter.ts:484-496`

```typescript
export function parseAssetName(assetName: string): {
  dex: string | null;
  symbol: string;
} {
  const colonIndex = assetName.indexOf(':');
  if (colonIndex === -1) {
    return { dex: null, symbol: assetName }; // Main DEX: "BTC"
  }
  return {
    dex: assetName.substring(0, colonIndex), // "xyz"
    symbol: assetName.substring(colonIndex + 1), // "XYZ100"
  };
}
```

**Naming Format**:

- **Main DEX**: `"BTC"`, `"ETH"`, `"SOL"` (no prefix)
- **HIP-3 DEXs**: `"xyz:TSLA"`, `"xyz:NVDA"`, `"abc:GOLD"` (dex:SYMBOL format)

**Decision Rationale**:

- **Unambiguous Identification**: Asset names uniquely identify both DEX and symbol
- **API Consistency**: HyperLiquid API returns assets in this format
- **UI Simplicity**: Easy parsing for display logic (show DEX badges for HIP-3 assets)

### 3.4 Multi-DEX WebSocket Strategy

**Location**: `HyperLiquidSubscriptionService.ts:44-112, 671-717`

**WebSocket Connection Architecture**:

- **1 shared WebSocket connection** (`HyperLiquidClientService.ts:45,85-87`)
- **Multiple subscriptions** on the same connection

```typescript
// Main DEX: webData2 (rich data with orders)
private readonly webData2Subscriptions = new Map<string, Subscription>();

// HIP-3 DEXs: clearinghouseState (positions/account only)
private readonly clearinghouseStateSubscriptions = new Map<string, Subscription>();

// All DEXs: assetCtxs (market data)
private readonly assetCtxsSubscriptions = new Map<string, Subscription>();
```

**Subscription Count per Configuration**:

| Enabled DEXs     | Total Subscriptions | Breakdown                                                                   |
| ---------------- | ------------------- | --------------------------------------------------------------------------- |
| Main only        | 1                   | 1 webData2 (main)                                                           |
| Main + xyz       | 2                   | 1 webData2 (main) + 1 clearinghouseState (xyz)                              |
| Main + xyz + abc | 3                   | 1 webData2 (main) + 1 clearinghouseState (xyz) + 1 clearinghouseState (abc) |

**Subscription Types**:

| Subscription Type    | Count    | DEXs              | Data Provided                     | Update Frequency |
| -------------------- | -------- | ----------------- | --------------------------------- | ---------------- |
| `webData2`           | 1        | Main DEX only     | Positions, Orders, Account, Fills | Real-time        |
| `clearinghouseState` | N        | 1 per HIP-3 DEX   | Positions, Account                | Real-time        |
| `assetCtxs`          | Variable | Per-DEX as needed | Market data, Funding rates        | Real-time        |

**Decision Rationale**:

- **Single Connection**: All subscriptions share one WebSocket connection for efficiency
- **SDK API Design**: `webData2` has no `dex` parameter (SDK source: `webData2.ts:15-31`), `clearinghouseState` has optional `dex` parameter (SDK source: `clearinghouseState.ts:11-32`)
- **Per-DEX Subscriptions**: Each HIP-3 DEX requires separate `clearinghouseState` subscription
- **REST Fallback for Orders**: `clearinghouseState` doesn't include orders; fetched via REST API (`HyperLiquidSubscriptionService.ts:1662-1666`)
- **Reference Counting**: Subscription lifecycle managed with subscriber counts (`HyperLiquidSubscriptionService.ts:849-886`)

**Subscription Setup Flow**:

```typescript
// HyperLiquidSubscriptionService.ts:671-717
private async ensureSharedWebData2Subscription(accountId?: CaipAccountId): Promise<void> {
  // 1. Main DEX: webData2 (richer data)
  if (!this.webData2Subscriptions.has('')) {
    await this.createWebData2Subscription(accountId);
  }

  // 2. HIP-3 DEXs: clearinghouseState (positions/account only)
  const hip3Dexs = this.enabledDexs.filter((dex): dex is string => dex !== null);
  await Promise.all(
    hip3Dexs.map(async (dex) => {
      await this.ensureClearinghouseStateSubscription(userAddress, dex);
    })
  );
}
```

### 3.5 Data Aggregation Strategy

**Location**: `HyperLiquidSubscriptionService.ts:477-511, 532-586`

**Per-DEX Caches**:

```typescript
// Separate caches for each DEX
private readonly dexPositionsCache = new Map<string, Position[]>();
private readonly dexOrdersCache = new Map<string, Order[]>();
private readonly dexAccountCache = new Map<string, AccountState>();

// Per-DEX reference counting
private readonly dexSubscriberCounts = new Map<string, number>();
```

**Account State Aggregation**:

```typescript
// HyperLiquidSubscriptionService.ts:477-511
private aggregateAccountStates(): AccountState {
  let totalAvailableBalance = 0;
  let totalBalance = 0;

  // Sum balances across all DEXs
  this.dexAccountCache.forEach((state, dex) => {
    totalAvailableBalance += parseFloat(state.availableBalance);
    totalBalance += parseFloat(state.totalBalance);
  });

  return {
    availableBalance: totalAvailableBalance.toString(),
    totalBalance: totalBalance.toString(),
    subAccountBreakdown  // Per-DEX breakdown for advanced users
  };
}
```

**Change Detection**:

```typescript
// HyperLiquidSubscriptionService.ts:532-586
private positionsChanged(newPositions: Position[]): boolean {
  const newHash = this.hashPositions(newPositions);
  const changed = newHash !== this.lastPositionsHash;
  this.lastPositionsHash = newHash;
  return changed;
}

private hashPositions(positions: Position[]): string {
  return positions
    .map((p) => `${p.asset}:${p.size}:${p.entryPrice}:${p.leverage}`)
    .sort()
    .join('|');
}
```

**Decision Rationale**:

- **Per-DEX Isolation**: Caches reflect HIP-3's isolated margin architecture
- **Efficient Updates**: Hash-based change detection reduces unnecessary re-renders
- **Unified Output**: Aggregated data provides unified view for UI
- **Advanced Visibility**: `subAccountBreakdown` enables per-DEX analysis

## 4. WebSocket Subscription Details

### 4.1 Main DEX Subscription (webData2)

**Setup**: `HyperLiquidSubscriptionService.ts:738-782`

```typescript
private async createWebData2Subscription(accountId?: CaipAccountId): Promise<void> {
  const userAddress = this.getAccountAddress(accountId);

  const webData2Sub = await this.subscriptionClient.subscribeToWebData2(
    { user: userAddress },
    (data) => {
      // Process positions
      if (data.clearinghouseState?.assetPositions) {
        const positions = this.transformPositions(data.clearinghouseState.assetPositions, '');
        this.dexPositionsCache.set('', positions);
      }

      // Process orders
      if (data.openOrders) {
        const orders = this.transformOrders(data.openOrders, '');
        this.dexOrdersCache.set('', orders);
      }

      // Process account state
      if (data.clearinghouseState) {
        const accountState = this.transformAccountState(data.clearinghouseState, '');
        this.dexAccountCache.set('', accountState);
      }

      this.emitAggregatedData();
    }
  );

  this.webData2Subscriptions.set('', webData2Sub);
}
```

**Data Available**:

- Positions with unrealized PnL
- Open orders with status
- Account balance and margin
- Recent fills history

### 4.2 HIP-3 DEX Subscription (clearinghouseState)

**Setup**: `HyperLiquidSubscriptionService.ts:784-832`

```typescript
private async ensureClearinghouseStateSubscription(
  userAddress: string,
  dex: string
): Promise<void> {
  const subKey = `${userAddress}:${dex}`;

  if (!this.clearinghouseStateSubscriptions.has(subKey)) {
    const chStateSub = await this.subscriptionClient.subscribeToClearinghouseState(
      { user: userAddress, dex },
      (data) => {
        // Process positions
        if (data.assetPositions) {
          const positions = this.transformPositions(data.assetPositions, dex);
          this.dexPositionsCache.set(dex, positions);
        }

        // Process account state
        const accountState = this.transformAccountState(data, dex);
        this.dexAccountCache.set(dex, accountState);

        this.emitAggregatedData();
      }
    );

    this.clearinghouseStateSubscriptions.set(subKey, chStateSub);
  }
}
```

**Data Available**:

- Positions with unrealized PnL
- Account balance and margin
- **Not Available**: Orders (requires REST API fallback)

**Orders Fallback**: `HyperLiquidProvider.ts:1247-1304`

```typescript
// Fetch orders via REST for HIP-3 DEXs
async getOpenOrders(accountId?: CaipAccountId): Promise<Order[]> {
  const allOrders: Order[] = [];

  // Get orders for each DEX
  for (const dex of this.getValidatedDexs()) {
    const dexOrders = await this.infoClient.frontendOpenOrders(userAddress, dex ?? '');
    allOrders.push(...this.transformOrders(dexOrders, dex));
  }

  return allOrders;
}
```

### 4.3 Market Data Subscription (assetCtxs)

**Setup**: `HyperLiquidSubscriptionService.ts:911-966`

```typescript
async subscribeToMarketData(
  assets: string[],
  callback: (data: MarketDataUpdate) => void
): Promise<() => void> {
  // Group assets by DEX
  const assetsByDex = this.groupAssetsByDex(assets);

  for (const [dex, dexAssets] of assetsByDex) {
    const subKey = `${dex}:${dexAssets.join(',')}`;

    if (!this.assetCtxsSubscriptions.has(subKey)) {
      const assetCtxsSub = await this.subscriptionClient.subscribeToAssetCtxs(
        { coins: dexAssets, dex: dex || '' },
        (data) => {
          // Transform and emit market data
          const marketData = this.transformMarketData(data, dex);
          callback(marketData);
        }
      );

      this.assetCtxsSubscriptions.set(subKey, assetCtxsSub);
    }
  }

  return () => this.unsubscribeFromMarketData(assets);
}
```

**Data Available**:

- Current price (oracle price)
- 24h price change
- 24h volume
- Funding rate (current + predicted)
- Open interest
- Mark price

## 5. Balance Management

HyperLiquid supports two modes for managing balances across DEXs:

### 5.1 Native DEX Abstraction (Primary)

**Feature Flag**: `useDexAbstraction: true` (default)

**How It Works**:

- User maintains single unified balance on main DEX
- HyperLiquid SDK automatically transfers required margin to HIP-3 DEX during order placement
- User sees single balance in UI (aggregated view)

**Implementation**: `HyperLiquidProvider.ts:1084-1147`

```typescript
async placeOrder(params: OrderParams): Promise<OrderResult> {
  // Construct order with native balance abstraction
  const order = {
    asset: params.asset,          // Asset ID (handles routing automatically)
    isBuy: params.isBuy,
    limitPx: params.limitPrice,
    sz: params.size,
    reduceOnly: params.reduceOnly,
    // No explicit DEX parameter needed - SDK handles it
  };

  return this.exchangeClient.placeOrder(order, vaultAddress);
}
```

**Decision Rationale**:

- **Simplified UX**: User doesn't need to manage per-DEX balances
- **SDK Handling**: HyperLiquid SDK manages transfers automatically

### 5.2 Programmatic Transfer (Fallback)

**Feature Flag**: `useDexAbstraction: false`

**How It Works**:

- User maintains separate balances per DEX
- MetaMask calculates required margin and auto-transfers before order placement
- Cleanup transfers return excess margin to main DEX after order fills

**Implementation**: `HyperLiquidProvider.ts:863-934`

```typescript
private async autoTransferForHip3Order(params: {
  targetDex: string;
  requiredMargin: number;
}): Promise<{ amount: number; sourceDex: string } | null> {
  // 1. Check if target DEX has sufficient balance
  const targetBalance = await this.getBalanceForDex({ dex: params.targetDex });
  if (targetBalance >= params.requiredMargin) {
    return null;  // No transfer needed
  }

  // 2. Calculate shortfall
  const shortfall = params.requiredMargin - targetBalance;

  // 3. Find source DEX with sufficient balance
  const source = await this.findSourceDexWithBalance({
    targetDex: params.targetDex,
    requiredAmount: shortfall
  });

  if (!source) {
    throw new Error('Insufficient balance across all DEXs');
  }

  // 4. Execute transfer
  const result = await this.transferBetweenDexs({
    sourceDex: source.sourceDex,
    destinationDex: params.targetDex,
    amount: (shortfall * HIP3_MARGIN_CONFIG.BUFFER_MULTIPLIER).toFixed(USDC_DECIMALS)
  });

  return result;
}
```

**Margin Calculation**: `HyperLiquidProvider.ts:936-969`

```typescript
private calculateRequiredMargin(params: {
  size: number;
  price: number;
  leverage: number;
}): number {
  const notionalValue = params.size * params.price;
  const baseMargin = notionalValue / params.leverage;

  // Add buffer for fees and slippage
  return baseMargin * HIP3_MARGIN_CONFIG.BUFFER_MULTIPLIER;  // 1.003 (0.3% buffer)
}
```

**Auto-Rebalance**: `HyperLiquidProvider.ts:971-1037`

```typescript
private async autoRebalanceAfterTrade(params: {
  targetDex: string;
}): Promise<void> {
  // 1. Get current balance on HIP-3 DEX
  const currentBalance = await this.getBalanceForDex({ dex: params.targetDex });

  // 2. Get locked margin from open positions
  const lockedMargin = await this.getLockedMarginForDex({ dex: params.targetDex });

  // 3. Calculate excess
  const excess = currentBalance - lockedMargin - HIP3_MARGIN_CONFIG.REBALANCE_DESIRED_BUFFER;

  // 4. Transfer excess back to main DEX if above threshold
  if (excess >= HIP3_MARGIN_CONFIG.REBALANCE_MIN_THRESHOLD) {
    await this.transferBetweenDexs({
      sourceDex: params.targetDex,
      destinationDex: null,  // Main DEX
      amount: excess.toFixed(USDC_DECIMALS)
    });
  }
}
```

**Configuration**: `hyperLiquidConfig.ts:288-307`

```typescript
export const HIP3_MARGIN_CONFIG = {
  BUFFER_MULTIPLIER: 1.003, // 0.3% buffer for fees/slippage
  REBALANCE_DESIRED_BUFFER: 0.1, // Keep $0.1 on DEX for quick orders
  REBALANCE_MIN_THRESHOLD: 0.1, // Only rebalance if excess > $0.1
};
```

**Decision Rationale**:

- **Fallback Safety**: Ensures functionality if native abstraction has issues
- **Minimal Locked Capital**: Auto-rebalance keeps only necessary margin on HIP-3 DEXs
- **Efficient Capital Use**: Excess margin returns to main DEX for global utilization
- **Fee Optimization**: Buffer covers HyperLiquid's max taker fee (0.045%)

## 6. Asset Mapping and DEX Routing

### 6.1 Asset Mapping Build Process

**Location**: `HyperLiquidProvider.ts:444-561`

```typescript
private async buildAssetMapping(): Promise<void> {
  // Get list of DEXs to map: [null (main), 'xyz', 'abc', ...]
  const dexsToMap = await this.getValidatedDexs();

  // Fetch metadata for all DEXs in parallel
  const allMetas = await Promise.allSettled(
    dexsToMap.map((dex) => this.infoClient.meta({ dex: dex ?? '' }))
  );

  // Build mappings for each DEX
  for (let perpDexIndex = 0; perpDexIndex < allMetas.length; perpDexIndex++) {
    const metaResult = allMetas[perpDexIndex];
    if (metaResult.status !== 'fulfilled') continue;

    const dex = dexsToMap[perpDexIndex];
    const meta = metaResult.value;

    // Build asset mappings using utility function
    const { coinToAssetId, assetIdToCoin } = buildAssetMapping({
      metaUniverse: meta.universe,
      dex,
      perpDexIndex
    });

    // Store in provider's lookup maps
    coinToAssetId.forEach((assetId, coin) => {
      this.coinToAssetId.set(coin, assetId);
      this.assetIdToCoin.set(assetId, coin);
    });
  }
}
```

**Mapping Utility**: `hyperLiquidAdapter.ts:331-358`

```typescript
export function buildAssetMapping(params: {
  metaUniverse: MetaResponse['universe'];
  dex?: string | null;
  perpDexIndex: number;
}): {
  coinToAssetId: Map<string, number>;
  assetIdToCoin: Map<number, string>;
} {
  const coinToAssetId = new Map<string, number>();
  const assetIdToCoin = new Map<number, string>();

  params.metaUniverse.forEach((asset, index) => {
    // Calculate global asset ID
    const assetId = calculateHip3AssetId(params.perpDexIndex, index);

    // API returns asset names already formatted:
    // Main DEX: "BTC", "ETH", "SOL"
    // HIP-3 DEXs: "xyz:TSLA", "xyz:NVDA", "abc:GOLD"
    const assetName = asset.name;

    coinToAssetId.set(assetName, assetId);
    assetIdToCoin.set(assetId, assetName);
  });

  return { coinToAssetId, assetIdToCoin };
}
```

**Example Mapping**:

```
Main DEX (perpDexIndex=0):
  "BTC" → 0
  "ETH" → 1
  "SOL" → 2

xyz DEX (perpDexIndex=1):
  "xyz:TSLA" → 110000
  "xyz:NVDA" → 110001
  "xyz:XYZ100" → 110002

abc DEX (perpDexIndex=2):
  "abc:GOLD" → 120000
  "abc:ABC500" → 120001
```

### 6.2 Order Routing

**Order Placement**: `HyperLiquidProvider.ts:1084-1147`

```typescript
async placeOrder(params: OrderParams): Promise<OrderResult> {
  // 1. Resolve asset name to global asset ID
  const assetId = this.coinToAssetId.get(params.asset);
  if (assetId === undefined) {
    throw new Error(`Unknown asset: ${params.asset}`);
  }

  // 2. Extract DEX from asset name (if HIP-3)
  const { dex, symbol } = parseAssetName(params.asset);

  // 3. Auto-transfer if needed (programmatic mode only)
  if (!this.useDexAbstraction && dex) {
    const requiredMargin = this.calculateRequiredMargin({
      size: params.size,
      price: params.limitPrice,
      leverage: params.leverage
    });

    await this.autoTransferForHip3Order({
      targetDex: dex,
      requiredMargin
    });
  }

  // 4. Place order (asset ID handles routing)
  const order = {
    asset: assetId,  // Global asset ID determines DEX automatically
    isBuy: params.isBuy,
    limitPx: params.limitPrice,
    sz: params.size,
    reduceOnly: params.reduceOnly,
  };

  const result = await this.exchangeClient.placeOrder(order, vaultAddress);

  // 5. Auto-rebalance after trade (programmatic mode only)
  if (!this.useDexAbstraction && dex) {
    await this.autoRebalanceAfterTrade({ targetDex: dex });
  }

  return result;
}
```

**DEX Resolution**:

- **Main DEX**: Asset ID 0-9999 → routes to main DEX
- **xyz DEX**: Asset ID 110000-110999 → routes to xyz DEX (perpDexIndex=1)
- **abc DEX**: Asset ID 120000-120999 → routes to abc DEX (perpDexIndex=2)

**No Explicit DEX Parameter**: HyperLiquid SDK uses asset ID to determine routing automatically.

## 7. Protocol Abstraction Preservation

### 7.1 Controller Layer (Zero HIP-3 Awareness)

**File**: `PerpsController.ts`

**Key Principle**: PerpsController has **zero HIP-3-specific code**. All HIP-3 complexity is encapsulated in the provider layer.

**Feature Flag Injection**: `PerpsController.ts:633-648`

```typescript
constructor({
  messenger,
  state = {},
  clientConfig = {},
}: PerpsControllerOptions) {
  // Store HIP-3 configuration (immutable after construction)
  this.equityEnabled = clientConfig.equityEnabled ?? false;
  this.enabledDexs = [...(clientConfig.enabledDexs ?? [])];

  // Pass to provider without direct HIP-3 knowledge
  // Controller doesn't interpret these flags
}
```

**Order Placement**: `PerpsController.ts:1084-1333`

```typescript
async placeOrder(params: OrderParams): Promise<OrderResult> {
  // Get active provider (protocol-agnostic)
  const provider = this.getActiveProvider();

  // Provider handles all HIP-3 complexity:
  // - Asset ID resolution
  // - DEX routing
  // - Balance management
  // - Auto-transfers
  return provider.placeOrder(params);
}
```

**Balance Retrieval**: `PerpsController.ts:920-974`

```typescript
async getAccountBalance(accountId?: CaipAccountId): Promise<AccountBalance> {
  const provider = this.getActiveProvider();

  // Provider returns aggregated balance
  // Controller doesn't know about per-DEX balances
  return provider.getAccountBalance(accountId);
}
```

**Decision Rationale**:

- **Protocol-Agnostic**: Controller works with any perps provider (HyperLiquid, dYdX, etc.)
- **Easy Migration**: Adding new providers doesn't require controller changes
- **Clean Separation**: Business logic (controller) vs. protocol specifics (provider)

### 7.2 Provider Layer (HIP-3 Implementation)

**File**: `HyperLiquidProvider.ts`

**Key Principle**: Provider implements IPerpsProvider interface while handling all HIP-3 specifics internally.

**Interface Implementation**:

```typescript
export class HyperLiquidProvider implements IPerpsProvider {
  // Feature flags (private, not exposed via interface)
  private equityEnabled: boolean;
  private enabledDexs: string[];
  private useDexAbstraction: boolean;

  // Asset mappings (private, not exposed via interface)
  private coinToAssetId: Map<string, number>;
  private assetIdToCoin: Map<number, string>;

  // IPerpsProvider interface methods (protocol-agnostic signatures)
  async initialize(config: ProviderConfig): Promise<void>;
  async placeOrder(params: OrderParams): Promise<OrderResult>;
  async getPositions(accountId?: CaipAccountId): Promise<Position[]>;
  async getAccountBalance(accountId?: CaipAccountId): Promise<AccountBalance>;
  // ... more interface methods
}
```

**Interface Compliance**:

- **Standard Method Signatures**: No HIP-3-specific parameters in interface methods
- **Internal Complexity**: HIP-3 logic hidden behind interface methods
- **Aggregated Data**: Returns unified views (positions, balances) across all DEXs

**Decision Rationale**:

- **Swappable Providers**: Controller can switch providers without code changes
- **Encapsulation**: HIP-3 complexity doesn't leak into controller layer
- **Testing**: Easy to mock providers for controller testing

### 7.3 Adapter Layer (Type Transformations)

**File**: `hyperLiquidAdapter.ts`

**Purpose**: Convert between HyperLiquid SDK types and protocol-agnostic types.

**Example Transformations**:

```typescript
// SDK Position → Protocol-Agnostic Position
export function transformPosition(
  sdkPosition: SDKPosition,
  dex: string | null,
): Position {
  return {
    asset: sdkPosition.coin, // Already formatted: "BTC" or "xyz:TSLA"
    size: parseFloat(sdkPosition.szi),
    entryPrice: parseFloat(sdkPosition.entryPx),
    unrealizedPnl: parseFloat(sdkPosition.unrealizedPnl),
    leverage: parseFloat(sdkPosition.leverage.value),
    marginUsed: parseFloat(sdkPosition.marginUsed),
    // ... more fields
  };
}

// SDK Order → Protocol-Agnostic Order
export function transformOrder(sdkOrder: SDKOrder, dex: string | null): Order {
  return {
    orderId: sdkOrder.oid.toString(),
    asset: sdkOrder.coin, // Already formatted: "BTC" or "xyz:TSLA"
    side: sdkOrder.side === 'B' ? 'buy' : 'sell',
    size: parseFloat(sdkOrder.sz),
    price: parseFloat(sdkOrder.limitPx),
    // ... more fields
  };
}
```

**Decision Rationale**:

- **Decoupling**: Controller doesn't depend on HyperLiquid SDK types
- **Provider Flexibility**: Easy to swap SDK versions without controller changes
- **Type Safety**: Compile-time checks for protocol-agnostic types

## 8. Code Reference Map

### Configuration & Constants

- **`hyperLiquidConfig.ts:231-239`**: HIP-3 asset ID configuration (BASE_ASSET_ID, DEX_MULTIPLIER)
- **`hyperLiquidConfig.ts:288-307`**: HIP-3 margin configuration (buffer, rebalance thresholds)
- **`hyperLiquidConfig.ts:266-279`**: HIP-3 asset market types (equity, commodity, forex badges)

### Asset Mapping & Routing

- **`hyperLiquidAdapter.ts:331-358`**: `buildAssetMapping()` - Asset mapping builder
- **`hyperLiquidAdapter.ts:456-468`**: `calculateHip3AssetId()` - Asset ID calculation formula
- **`hyperLiquidAdapter.ts:484-496`**: `parseAssetName()` - Asset name parsing (dex:SYMBOL)
- **`HyperLiquidProvider.ts:444-561`**: `buildAssetMapping()` - Provider asset mapping initialization

### Feature Flags

- **`PerpsController.ts:633-648`**: Feature flag injection (constructor)
- **`HyperLiquidProvider.ts:158-163`**: Feature flag storage (private fields)
- **`HyperLiquidProvider.ts:239-304`**: Feature flag initialization

### WebSocket Subscriptions

- **`HyperLiquidSubscriptionService.ts:44-112`**: Subscription storage (Maps for all subscription types)
- **`HyperLiquidSubscriptionService.ts:671-717`**: `ensureSharedWebData2Subscription()` - Main subscription setup
- **`HyperLiquidSubscriptionService.ts:738-782`**: `createWebData2Subscription()` - Main DEX subscription
- **`HyperLiquidSubscriptionService.ts:784-832`**: `ensureClearinghouseStateSubscription()` - HIP-3 DEX subscription
- **`HyperLiquidSubscriptionService.ts:911-966`**: `subscribeToMarketData()` - Market data subscription

### Data Aggregation

- **`HyperLiquidSubscriptionService.ts:477-511`**: `aggregateAccountStates()` - Balance aggregation
- **`HyperLiquidSubscriptionService.ts:513-530`**: `aggregatePositions()` - Position aggregation
- **`HyperLiquidSubscriptionService.ts:532-586`**: Change detection (hash-based)

### Balance Management

- **`HyperLiquidProvider.ts:863-934`**: `autoTransferForHip3Order()` - Programmatic auto-transfer
- **`HyperLiquidProvider.ts:936-969`**: `calculateRequiredMargin()` - Margin calculation
- **`HyperLiquidProvider.ts:971-1037`**: `autoRebalanceAfterTrade()` - Post-trade rebalance
- **`HyperLiquidProvider.ts:1039-1082`**: `transferBetweenDexs()` - DEX-to-DEX transfer

### Order Placement

- **`HyperLiquidProvider.ts:1084-1147`**: `placeOrder()` - Order placement with routing
- **`PerpsController.ts:1084-1333`**: `placeOrder()` - Controller (protocol-agnostic)

### Protocol Abstraction

- **`PerpsController.ts:920-974`**: `getAccountBalance()` - Controller (protocol-agnostic)
- **`HyperLiquidProvider.ts:1247-1304`**: `getOpenOrders()` - Provider (HIP-3 REST fallback)

## Appendix: HIP-3 Protocol Summary

### Core Concepts

- **Builder Deployment**: Builders stake 500k HYPE to deploy custom perpetuals
- **Isolated Margin**: Each DEX uses isolated margin
- **Separate Orderbooks**: Each DEX has independent liquidity
- **Settlement Authority**: Deployers can settle positions (with slashing risk)
- **Open Interest Caps**: Per-DEX notional caps + per-asset size caps

### Asset ID Formula

```
Main DEX (perpDexIndex=0):
  assetId = index

HIP-3 DEX (perpDexIndex > 0):
  assetId = 100000 + (perpDexIndex × 10000) + index
```

### Naming Convention

```
Main DEX: "BTC", "ETH", "SOL"
HIP-3 DEXs: "xyz:TSLA", "xyz:NVDA", "abc:GOLD"
```

### WebSocket Subscriptions

**Connection**: 1 shared WebSocket connection for all subscriptions

| Type                 | Count             | DEXs           | Data                                 |
| -------------------- | ----------------- | -------------- | ------------------------------------ |
| `webData2`           | 1                 | Main DEX only  | Positions, Orders, Account, Fills    |
| `clearinghouseState` | 1 per HIP-3 DEX   | Each HIP-3 DEX | Positions, Account (orders via REST) |
| `assetCtxs`          | Per-DEX as needed | All DEXs       | Market data, Funding rates           |

**Example**: With "xyz" and "abc" enabled → 3 subscriptions on 1 WebSocket:

- 1 webData2 (main)
- 1 clearinghouseState (xyz)
- 1 clearinghouseState (abc)

### Balance Management Modes

**Native DEX Abstraction** (default):

- Single unified balance
- SDK auto-transfers during orders
- Simplified UX

**Programmatic Transfer**:

- Per-DEX balances
- MetaMask manages transfers
- Auto-rebalance after trades

---

**Document Version**: 1.0
**Last Updated**: 2025-01-28
**Related Docs**:

- [HIP-3 Specification](./HIP-3.md)
- [HyperLiquid Protocol Overview](./HYPERLIQUID.md)
