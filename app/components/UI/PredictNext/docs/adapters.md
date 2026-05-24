# PredictNext Adapter Layer

This document describes the adapter layer for PredictNext. Adapters are the seam between external prediction-market providers and the canonical Predict domain model used by services, hooks, and components.

Related documents:

- [architecture.md](./architecture.md)
- [services.md](./services.md)
- [error-handling.md](./error-handling.md)
- [testing.md](./testing.md)
- [../CONTEXT.md](../CONTEXT.md)

## 1. Adapter Pattern Overview

Adapters translate provider-specific APIs into Predict's canonical model:

- `PredictEvent`
- `PredictMarket`
- `PredictOutcome`
- `PredictPosition`
- `ActivityItem`
- `OrderPreview`
- `TransactionBatch`

The adapter layer exists so the rest of PredictNext never depends on:

- provider-specific DTOs
- endpoint naming
- authentication headers and API-key mechanics
- socket transport details
- provider-specific account models
- Polymarket-specific naming such as `conditionId`, `clobTokenIds`, or Safe/deposit-wallet payload shapes

### Target shape

Each adapter should expose a small capability-oriented interface. The methods are fetch, transform, build, submit, or subscribe operations only.

Adapters do:

- call remote APIs or SDKs
- transform remote payloads into canonical Predict entities
- build provider-specific order or transaction payloads
- submit provider-specific orders
- create live data subscriptions
- keep lightweight auth/session primitives required by a provider SDK

Adapters do not:

- cache query results
- retry transient failures
- orchestrate multi-step workflows
- manage UI-facing state
- emit analytics
- decide product behavior
- own rate limiting
- own optimistic overlays
- own active-order state transitions

The rest of PredictNext treats adapters as swappable protocol implementations behind a stable domain contract.

```text
 [ Service ]           [ Adapter ]           [ Provider API ]
      |                     |                      |
      |--- call method ---->|                      |
      |                     |--- request --------->|
      |                     |                      |
      |                     |<-- provider DTO -----|
      |                     |                      |
      |                     | [ Transform DTO ]    |
      |                     | [ to PredictType ]   |
      |                     |                      |
      |<-- PredictType -----|                      |
```

Adding a new provider should primarily mean implementing one interface and registering it in the adapter factory.

## 2. Naming Rules

Use different verbs at each layer so responsibility is visible from the call site.

| Layer           | Verb pattern                                                              | Example                                        |
| --------------- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| Adapter         | provider boundary verbs: `fetch`, `build`, `submit`, `createSubscription` | `fetchEvents`, `buildDepositTx`, `submitOrder` |
| Service         | product capability verbs: `get`, `preview`, `place`, `deposit`            | `getEvents`, `previewOrder`, `placeOrder`      |
| Legacy provider | old public names retained during migration                                | `getMarkets`, `getMarketDetails`, `placeOrder` |

During migration, old `PolymarketProvider` methods keep their legacy names and delegate downward:

```text
PolymarketProvider.getMarkets()
  → PolymarketAdapter.fetchEvents()
  → PredictNext/compat.toOldMarket()
  → legacy PredictMarket[]
```

This keeps existing hooks and UI stable while the new adapter becomes the implementation source.

## 3. PredictAdapter Interface

The `PredictAdapter` contract defines the provider seam for the redesigned feature. The exact TypeScript implementation will live in `app/components/UI/PredictNext/adapters/types.ts`; this sketch is the intended shape.

### Canonical type rule during migration

The canonical entities must be rich enough to preserve old UI behavior while old screens are still rendering from legacy types. The migration plan depends on canonical and legacy shapes being effectively isomorphic, with naming corrected:

| Legacy type           | Canonical type   |
| --------------------- | ---------------- |
| `PredictMarket`       | `PredictEvent`   |
| `PredictOutcome`      | `PredictMarket`  |
| `PredictOutcomeToken` | `PredictOutcome` |

Do not introduce a thin canonical event type that drops fields needed by old UI. If the old UI needs a field, either carry it in the canonical model or explicitly mark it as a provider-specific extension that compat mappers preserve.

```typescript
export type Unsubscribe = () => void;

export type PredictProviderId = 'polymarket' | 'kalshi';

export type TimePeriod = '1H' | '1D' | '1W' | '1M' | 'ALL';

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string | null;
}

export interface PredictSeries {
  id: string;
  slug: string;
  title: string;
  recurrence: string;
}

export interface PredictSportTeam {
  id: string;
  name: string;
  logo: string;
  abbreviation: string;
  color: string;
  alias?: string;
}

export interface PredictGame {
  id: string;
  startTime: string;
  endTime?: string;
  status: 'scheduled' | 'ongoing' | 'ended';
  league: string;
  elapsed: string | null;
  period: string | null;
  score: { home: number; away: number; raw: string } | null;
  homeTeam: PredictSportTeam;
  awayTeam: PredictSportTeam;
  turn?: string;
}

export interface PredictOutcome {
  /** Tradeable side of a binary Market. Legacy equivalent: PredictOutcomeToken. */
  id: string;
  label: string;
  shortLabel?: string;
  price: number;
}

export interface PredictMarket {
  /** Single binary question within an Event. Legacy equivalent: PredictOutcome. */
  id: string;
  providerId: PredictProviderId;
  eventId: string;
  title: string;
  description?: string;
  image?: string;
  status: 'open' | 'closed' | 'resolved';
  active?: boolean;
  acceptingOrders?: boolean;
  outcomes: PredictOutcome[];
  volume: number;
  liquidity?: number;
  groupItemTitle?: string;
  groupItemThreshold?: number;
  negRisk?: boolean;
  tickSize?: string;
  sportsMarketType?: string;
  line?: number;
  resolvedBy?: string;
  resolutionStatus?: string;
}

export interface PredictMarketGroup {
  key: string;
  markets: PredictMarket[];
  subgroups?: PredictMarketGroup[];
}

export interface PredictEvent {
  /** Group of related Markets. Legacy equivalent: PredictMarket. */
  id: string;
  providerId: PredictProviderId;
  slug: string;
  title: string;
  description?: string;
  image?: string;
  status: 'upcoming' | 'live' | 'open' | 'closed' | 'resolved';
  active?: boolean;
  recurrence?: string;
  category?: string;
  tags: string[];
  markets: PredictMarket[];
  marketGroups?: PredictMarketGroup[];
  liquidity: number;
  volume: number;
  startsAt?: string;
  endsAt?: string;
  resolvesAt?: string;
  game?: PredictGame;
  series?: PredictSeries;
  parentEventId?: string | number | null;
  childEventIds?: string[];
  isHighlighted?: boolean;
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface PriceQuery {
  eventId: string;
  marketId: string;
  outcomeId: string;
}

export interface PriceResult {
  eventId: string;
  marketId: string;
  outcomeId: string;
  buy: number;
  sell: number;
}

export interface MarketPrices {
  providerId: PredictProviderId;
  results: PriceResult[];
}

export interface PredictPosition {
  id: string;
  providerId: PredictProviderId;
  eventId: string;
  marketId: string;
  outcomeId: string;
  outcomeLabel: string;
  currentValue: number;
  title: string;
  icon: string;
  amount: number;
  price: number;
  status: 'open' | 'redeemable' | 'won' | 'lost';
  size: number;
  outcomeIndex: number;
  realizedPnl?: number;
  percentPnl: number;
  cashPnl: number;
  claimable: boolean;
  initialValue: number;
  averageEntryPrice: number;
  endDate: string;
  negRisk?: boolean;
  optimistic?: boolean;
}

export interface ActivityItem {
  id: string;
  providerId: PredictProviderId;
  type: 'buy' | 'sell' | 'claim' | 'deposit' | 'withdrawal';
  timestamp: number;
  eventId?: string;
  marketId?: string;
  outcomeId?: string;
  amount?: number;
  price?: number;
  txHash?: string;
  title?: string;
  outcomeLabel?: string;
  icon?: string;
}

export interface Balance {
  tokenAddress: string;
  symbol: string;
  amount: string;
  decimals: number;
}

export type PredictWalletType = 'safe' | 'deposit-wallet' | 'direct';

export interface AccountState {
  /** The user's MetaMask account address. */
  ownerAddress: string;
  /** The provider-side trading address used for data queries and order submission. */
  providerAccountAddress: string;
  /** Present when the provider uses a proxy wallet. */
  proxyWalletAddress?: string;
  walletType: PredictWalletType;
  isDeployed: boolean;
  availableBalances: Balance[];
  selectedPaymentTokenAddress?: string;
  canTrade: boolean;
  requiresWalletSetup: boolean;
}

export interface FetchEventsParams {
  cursor?: string | null;
  category?: string;
  league?: string;
  status?: 'upcoming' | 'live' | 'open' | 'closed' | 'resolved';
  sort?: 'featured' | 'volume' | 'endingSoon' | 'new';
  limit?: number;
  customQueryParams?: string;
}

export interface SearchEventsParams {
  query: string;
  limit?: number;
  page?: number;
}

export interface FetchPositionsParams {
  ownerAddress: string;
  limit?: number;
  offset?: number;
  claimable?: boolean;
  eventId?: string;
  marketId?: string;
}

export interface PreviewParams {
  ownerAddress: string;
  eventId: string;
  marketId: string;
  outcomeId: string;
  side: 'buy' | 'sell';
  size: number;
  positionId?: string;
  paymentTokenAddress?: string;
}

export interface SubmitOrderParams {
  ownerAddress: string;
  preview: OrderPreview;
  slippageBps?: number;
}

export interface OrderPreview {
  eventId: string;
  marketId: string;
  outcomeId: string;
  timestamp: number;
  side: 'buy' | 'sell';
  sharePrice: number;
  maxAmountSpent: number;
  minAmountReceived: number;
  slippage: number;
  tickSize: number;
  minOrderSize: number;
  negRisk: boolean;
  feeRateBps?: string;
  fees?: {
    metamaskFee: number;
    providerFee: number;
    marketFee?: number;
    totalFee: number;
    totalFeePercentage: number;
  };
  rateLimited?: boolean;
  positionId?: string;
  orderType?: 'FOK' | 'FAK';
}

export interface OrderReceipt {
  orderId: string;
  status: 'submitted' | 'filled' | 'partially_filled';
  providerOrderId?: string;
  spentAmount: string;
  receivedAmount: string;
  txHashes: string[];
}

export interface DepositParams {
  ownerAddress: string;
  tokenAddress: string;
  amount: string;
}

export interface WithdrawParams {
  ownerAddress: string;
  tokenAddress: string;
  amount: string;
}

export interface ClaimParams {
  ownerAddress: string;
  positions: PredictPosition[];
}

export interface TransactionRequest {
  to: string;
  data: string;
  value?: string;
  gas?: string;
  type?: string;
}

export interface TransactionBatch {
  chainId: string;
  requests: TransactionRequest[];
  requiresSignature: boolean;
  providerAccountAddress?: string;
}

export type SubscriptionRequest =
  | {
      channel: 'gameUpdates';
      params: { gameId: string };
      callback: (update: GameUpdate) => void;
    }
  | {
      channel: 'marketPrices';
      params: { outcomeIds: string[] };
      callback: (updates: PriceUpdate[]) => void;
    }
  | {
      channel: 'orderbook';
      params: { outcomeId: string };
      callback: (snapshot: OrderbookSnapshot) => void;
    }
  | {
      channel: 'cryptoPrices';
      params: { symbols: string[] };
      callback: (update: CryptoPriceUpdate) => void;
    };

export interface ProviderCapabilities {
  supportsDeposits: boolean;
  supportsWithdrawals: boolean;
  supportsClaims: boolean;
  supportsProxyWallet: boolean;
  supportsLivePrices: boolean;
  supportsOrderbook: boolean;
}

export interface PredictAdapter {
  readonly providerId: PredictProviderId;
  readonly capabilities: ProviderCapabilities;

  fetchEvents(
    params: FetchEventsParams,
  ): Promise<PaginatedResult<PredictEvent>>;
  fetchEvent(eventId: string): Promise<PredictEvent>;
  fetchEventsByIds(eventIds: string[]): Promise<PredictEvent[]>;
  fetchCarouselEvents(): Promise<PredictEvent[]>;
  searchEvents(
    params: SearchEventsParams,
  ): Promise<PaginatedResult<PredictEvent>>;
  fetchEventSeries(params: {
    seriesId: string;
    endDateMin: string;
    endDateMax: string;
    limit?: number;
  }): Promise<PredictEvent[]>;
  fetchPriceHistory(params: {
    marketId: string;
    period?: TimePeriod;
    fidelity?: number;
    interval?: string;
    startTs?: number;
    endTs?: number;
  }): Promise<PricePoint[]>;
  fetchPrices(params: { queries: PriceQuery[] }): Promise<MarketPrices>;

  fetchPositions(params: FetchPositionsParams): Promise<PredictPosition[]>;
  fetchActivity(params: {
    ownerAddress: string;
    cursor?: string;
  }): Promise<PaginatedResult<ActivityItem>>;
  fetchBalance(params: { ownerAddress: string }): Promise<Balance[]>;
  fetchUnrealizedPnL(params: { ownerAddress: string }): Promise<{
    cashPnl: number;
    percentPnl: number;
  }>;
  fetchAccountState(params: {
    ownerAddress: string;
    forceRefresh?: boolean;
  }): Promise<AccountState>;

  getOrderPreview(params: PreviewParams): Promise<OrderPreview>;
  submitOrder(params: SubmitOrderParams): Promise<OrderReceipt>;

  buildDepositTx(params: DepositParams): Promise<TransactionBatch>;
  buildWithdrawTx(params: WithdrawParams): Promise<TransactionBatch>;
  buildClaimTx(params: ClaimParams): Promise<TransactionBatch>;

  createSubscription(request: SubscriptionRequest): Unsubscribe;
}
```

### Why this interface is intentionally broad but shallow

The adapter interface spans the provider boundary for three reasons:

1. services need one place to get provider capabilities
2. the rest of the system should not depend on provider SDKs
3. adding a provider should not force new abstractions into higher layers

Even so, the interface remains shallow. It describes provider capabilities, not workflows. For example, `submitOrder()` exists, but `depositThenSubmitOrder()` does not. That workflow belongs in `TradingService`, not in the adapter.

## 4. PolymarketAdapter Implementation

`PolymarketAdapter` is the initial concrete adapter for PredictNext.

### Provider surfaces used

Polymarket requires multiple underlying APIs and transports:

- Gamma API for event and market discovery
- CLOB API for price history, orderbook, previewing, and order submission
- Polymarket data/account endpoints for balances, positions, activity, and PnL
- WebSocket feeds for live price, orderbook, sports game, and crypto price updates
- on-chain helpers for balances and provider transaction construction

```text
                PredictAdapter (Interface)
                          ^
                          |
                +-------------------+
                | PolymarketAdapter |
                +-------------------+
                 /        |        \         \
                v         v         v         v
          Gamma API   CLOB API   Data/Acct   WebSockets
          (Events)    (Orders)   Endpoints   (Live)
```

The adapter unifies those sources into the Predict domain model.

### Transformation responsibility

The core job of `PolymarketAdapter` is transformation. The rest of the application should never depend on Gamma event DTOs, CLOB-specific terminology, or Polymarket account payloads.

Examples of translation:

- Polymarket events become `PredictEvent`
- Polymarket markets / conditions become `PredictMarket`
- Polymarket outcome tokens become `PredictOutcome`
- account holdings become `PredictPosition`
- fills, deposits, withdrawals, and claims become `ActivityItem`

### Authentication responsibility

Authentication details stay inside the adapter seam.

Examples:

- CLOB API-key creation and lookup
- L2 header construction
- CLOB signing requirements
- account-specific headers or session configuration

Services can request capabilities like `getOrderPreview()` or `submitOrder()` without knowing how Polymarket authenticates those calls.

### Stateful workflow exclusions

Several current `PolymarketProvider` responsibilities must not be blindly moved into the adapter:

| Current responsibility in `PolymarketProvider` | Target owner                                      |
| ---------------------------------------------- | ------------------------------------------------- |
| order rate limiting                            | `TradingService`                                  |
| active-order state machine                     | `TradingService` / controller session state       |
| optimistic position overlays                   | `TradingService` and portfolio cache invalidation |
| deposit-before-order chaining                  | `TradingService` + `TransactionService`           |
| transaction status side effects                | `TransactionService` / controller integration     |
| analytics                                      | `AnalyticsService`                                |
| retries and cache fallback                     | BaseDataService-backed services                   |

Phase 2 may temporarily leave these responsibilities in the old provider while the old provider delegates lower-level reads and provider requests to the adapter. They move to services in Phases 3 and 4.

### Example transformation

This sketch intentionally uses canonical names while preserving enough fields for legacy UI parity.

```typescript
function mapPolymarketEvent(dto: PolymarketGammaEventDto): PredictEvent {
  const markets = dto.markets.map((market) => ({
    id: market.conditionId,
    providerId: 'polymarket',
    eventId: dto.id,
    title: market.question,
    description: market.description,
    image: market.icon ?? market.image,
    status: market.closed ? 'closed' : market.active ? 'open' : 'resolved',
    active: market.active,
    acceptingOrders: market.acceptingOrders,
    volume: market.volumeNum ?? 0,
    liquidity: market.liquidity ?? 0,
    groupItemTitle: market.groupItemTitle,
    groupItemThreshold: market.groupItemThreshold,
    negRisk: market.negRisk,
    tickSize: market.orderPriceMinTickSize?.toString() ?? '0.01',
    sportsMarketType: market.sportsMarketType,
    line: market.line,
    outcomes: parseOutcomeTokens(market).map((token) => ({
      id: token.id,
      label: token.title,
      shortLabel: token.shortTitle,
      price: token.price,
    })),
  }));

  return {
    id: dto.id,
    providerId: 'polymarket',
    slug: dto.slug,
    title: dto.title,
    description: dto.description,
    image: dto.icon,
    status: dto.closed ? 'closed' : dto.active ? 'open' : 'upcoming',
    active: dto.active,
    category: inferCategory(dto),
    tags: dto.tags?.map((tag) => tag.slug) ?? [],
    markets,
    liquidity: dto.liquidity ?? 0,
    volume: dto.volume ?? 0,
    endsAt: dto.endDate,
    game: mapGame(dto),
    series: mapSeries(dto.series),
    parentEventId: dto.parentEventId,
  };
}
```

The specific mapping details will evolve, but the architectural rule does not: transformation belongs here, not in services or hooks.

## 5. Future KalshiAdapter

`KalshiAdapter` is the expected next provider implementation. The existing `PredictAdapter` interface is designed to support it without changing higher layers.

### Same contract, different transport and semantics

Kalshi is likely to differ from Polymarket in several important ways:

- direct trading rather than a proxy wallet flow
- different order types and preview semantics
- different account and position models
- SSE or another streaming mechanism instead of the same WebSocket contract

Those differences should remain inside `KalshiAdapter`.

### How the interface accommodates provider differences

The contract is intentionally phrased in product capabilities, not provider implementation details.

Examples:

- `submitOrder()` does not require callers to know how the provider executes the order
- `buildDepositTx()` may return a trivial or empty batch if the provider does not need the same funding flow
- `createSubscription()` abstracts whether the provider uses WebSocket, SSE, or another push channel
- `fetchAccountState()` normalizes eligibility and setup conditions into a Predict-friendly shape

This means the service layer can remain stable even when providers differ substantially.

### Provider-specific freedom inside the seam

The adapter interface does not force identical internal implementations. A Kalshi adapter may:

- omit proxy-wallet mechanics internally
- translate provider-specific order states into the canonical order result shape
- use different auth or signing models
- compose multiple APIs differently than Polymarket does

The only requirement is that callers continue to receive canonical Predict entities and capability-level methods.

## 6. Adding a New Provider

Adding a provider should be a bounded infrastructure change, not a feature-wide rewrite.

### Step 1: implement `PredictAdapter`

Create a concrete adapter that fulfills the full `PredictAdapter` interface. Every returned value must be canonical Predict domain data, not provider DTOs.

### Step 2: add provider configuration

Define adapter-specific configuration such as:

- base URLs
- auth settings
- chain and token defaults
- supported live-data channels
- provider capability flags if needed for internal adapter decisions

### Step 3: register in the adapter factory

Use a provider key to resolve the correct adapter implementation.

```typescript
export type PredictProviderId = 'polymarket' | 'kalshi';

export interface PredictAdapterFactory {
  create(providerId: PredictProviderId): PredictAdapter;
}
```

The factory is the seam where environment, feature flags, or account-specific provider selection can be resolved.

### Step 4: verify service compatibility

Run service integration tests against the new adapter contract. If service code needs provider-specific branching, that is a design smell. Prefer pushing that difference downward into the adapter.

### Step 5: add adapter integration tests

Test the new adapter at the provider seam:

- HTTP payload mapping
- account mapping
- order preview mapping
- transaction batch construction
- live data subscription translation

### Acceptance rule for new providers

A new provider integration is architecturally successful when:

- hooks do not change
- components do not change
- controller shape does not change
- service public interfaces do not change
- only adapter implementation and provider configuration need significant work

That is the payoff of keeping adapters thin, services deep, and the public Predict model canonical.
