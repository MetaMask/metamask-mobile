# PredictNext Adapter Layer

This document describes the adapter layer for PredictNext. Adapters are the boundary between external prediction-market providers and the canonical Predict domain model used by services, hooks, and components.

Related documents:

- [architecture.md](./architecture.md)
- [services.md](./services.md)
- [error-handling.md](./error-handling.md)
- [testing.md](./testing.md)

## 1. Adapter Pattern Overview

Adapters translate provider-specific APIs into Predict's canonical model:

- `PredictEvent`
- `PredictMarket`
- `PredictOutcome`
- `PredictPosition`
- `ActivityItem`
- `OrderPreview`
- `TransactionBatch`

The adapter layer exists so the rest of the feature never needs to depend on:

- provider-specific DTOs
- endpoint naming
- authentication details
- socket transport details
- provider-specific account models

### Target shape

Each adapter should expose roughly fifteen methods. Those methods should be fetch-and-transform only.

Adapters do:

- call remote APIs or SDKs
- transform remote payloads
- build provider-specific order or transaction payloads
- create live data subscriptions

Adapters do not:

- cache
- retry
- orchestrate multi-step workflows
- manage UI-facing state
- emit analytics
- decide product behavior

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

Adding a new provider should primarily mean implementing one interface.

## 2. PredictAdapter Interface

The `PredictAdapter` contract defines the full provider boundary for the redesigned feature.

```typescript
export type Unsubscribe = () => void;

export type TimePeriod = '1H' | '1D' | '1W' | '1M' | 'ALL';

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
}

export interface PredictOutcome {
  id: string;
  label: string;
  price: string;
  probability: number;
  volume?: string;
}

export interface PredictMarket {
  id: string;
  eventId: string;
  question: string;
  status: 'open' | 'closed' | 'resolved';
  closesAt?: string;
  resolvesAt?: string;
  outcomes: PredictOutcome[];
}

export interface PredictEvent {
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  status: 'upcoming' | 'live' | 'resolved';
  startsAt?: string;
  resolvesAt?: string;
  markets: PredictMarket[];
}

export interface PricePoint {
  timestamp: string;
  value: string;
}

export interface MarketPrices {
  marketId: string;
  bestBid?: string;
  bestAsk?: string;
  lastTradedPrice?: string;
  updatedAt: string;
}

export interface PredictPosition {
  id: string;
  accountId: string;
  marketId: string;
  outcomeId: string;
  shares: string;
  averageEntryPrice: string;
  currentValue: string;
  unrealizedPnL: string;
}

export interface ActivityItem {
  id: string;
  type: 'order' | 'deposit' | 'withdrawal' | 'claim';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  description: string;
  txHash?: string;
}

export interface Balance {
  tokenAddress: string;
  symbol: string;
  amount: string;
  decimals: number;
}

export interface AccountState {
  accountId: string;
  availableBalances: Balance[];
  selectedPaymentTokenAddress?: string;
  canTrade: boolean;
  requiresWalletSetup: boolean;
}

export interface FetchEventsParams {
  cursor?: string;
  league?: string;
  status?: 'upcoming' | 'live' | 'resolved';
  sort?: 'featured' | 'volume' | 'endingSoon';
  limit?: number;
}

export interface PreviewParams {
  accountId: string;
  marketId: string;
  outcomeId: string;
  side: 'buy' | 'sell';
  amount: string;
  paymentTokenAddress?: string;
}

export interface SubmitOrderParams extends PreviewParams {
  slippageBps?: number;
}

export interface OrderPreview {
  marketId: string;
  outcomeId: string;
  estimatedShares: string;
  averagePrice: string;
  fee: string;
  requiresDeposit: boolean;
  totalCost: string;
}

export interface OrderReceipt {
  orderId: string;
  status: 'submitted' | 'filled' | 'partially_filled';
  providerOrderId?: string;
  txHashes: string[];
}

export interface DepositParams {
  accountId: string;
  tokenAddress: string;
  amount: string;
}

export interface WithdrawParams {
  accountId: string;
  tokenAddress: string;
  amount: string;
}

export interface ClaimParams {
  accountId: string;
  eventId: string;
  marketIds?: string[];
}

export interface TransactionRequest {
  to: string;
  data: string;
  value?: string;
}

export interface TransactionBatch {
  chainId: string;
  requests: TransactionRequest[];
  requiresSignature: boolean;
}

export interface PredictAdapter {
  fetchEvents(
    params: FetchEventsParams,
  ): Promise<PaginatedResult<PredictEvent>>;
  fetchEvent(eventId: string): Promise<PredictEvent>;
  fetchCarouselEvents(): Promise<PredictEvent[]>;
  searchEvents(query: string): Promise<PredictEvent[]>;
  fetchPriceHistory(
    marketId: string,
    period: TimePeriod,
  ): Promise<PricePoint[]>;
  fetchPrices(marketIds: string[]): Promise<Map<string, MarketPrices>>;

  fetchPositions(accountId: string): Promise<PredictPosition[]>;
  fetchActivity(
    accountId: string,
    cursor?: string,
  ): Promise<PaginatedResult<ActivityItem>>;
  fetchBalance(accountId: string): Promise<Balance[]>;
  fetchAccountState(accountId: string): Promise<AccountState>;

  submitOrder(params: SubmitOrderParams): Promise<OrderReceipt>;
  getOrderPreview(params: PreviewParams): Promise<OrderPreview>;

  buildDepositTx(params: DepositParams): Promise<TransactionBatch>;
  buildWithdrawTx(params: WithdrawParams): Promise<TransactionBatch>;
  buildClaimTx(params: ClaimParams): Promise<TransactionBatch>;

  createSubscription(
    channel: string,
    params: unknown,
    callback: (data: unknown) => void,
  ): Unsubscribe;
}
```

### Why this interface is intentionally broad but shallow

The adapter interface spans the provider boundary for three reasons:

1. services need one place to get provider capabilities
2. the rest of the system should not depend on provider SDKs
3. adding a provider should not force new abstractions into higher layers

Even so, the interface remains shallow. It describes capabilities, not orchestration. For example, `submitOrder()` exists, but `depositThenSubmitOrder()` does not. That workflow belongs in `TradingService`, not in the adapter.

## 3. PolymarketAdapter Implementation

`PolymarketAdapter` is the initial concrete adapter for PredictNext.

### Provider surfaces used

Polymarket requires multiple underlying APIs and transports:

- Gamma API for market and event discovery
- CLOB API for order placement and previewing
- Polymarket account endpoints for balances, positions, and activity
- WebSocket feeds for live price and status updates

```text
                PredictAdapter (Interface)
                          ^
                          |
                +-------------------+
                | PolymarketAdapter |
                +-------------------+
                 /        |        \         \
                v         v         v         v
          Gamma API   CLOB API   Account   WebSockets
          (Events)    (Orders)   Endpoints   (Live)
```

The adapter unifies those sources into the Predict domain model.

### Transformation responsibility

The core job of `PolymarketAdapter` is transformation. The rest of the application should never depend on Gamma event DTOs or CLOB-specific terminology.

Examples of translation:

- Polymarket event payloads become `PredictEvent`
- Polymarket markets become `PredictMarket`
- Polymarket outcomes become `PredictOutcome`
- account holdings become `PredictPosition`
- fills, deposits, and claims become `ActivityItem`

### Authentication responsibility

Authentication details also stay inside the adapter boundary.

Examples:

- API key management for Polymarket endpoints
- CLOB signing requirements
- account-specific headers or session configuration

Services can request capabilities like `getOrderPreview()` or `submitOrder()` without knowing how Polymarket authenticates those calls.

### Example transformation

The following sketch shows the shape of a provider-to-domain transform for event reads.

```typescript
interface PolymarketGammaEventDto {
  id: string;
  title: string;
  description?: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  startDate?: string;
  endDate?: string;
  markets: Array<{
    id: string;
    question: string;
    active: boolean;
    closed: boolean;
    outcomes: Array<{
      id: string;
      label: string;
      price: string;
      probability?: number;
    }>;
  }>;
}

function mapPolymarketEvent(dto: PolymarketGammaEventDto): PredictEvent {
  const status: PredictEvent['status'] =
    dto.archived || dto.closed ? 'resolved' : dto.active ? 'live' : 'upcoming';

  return {
    id: dto.id,
    title: dto.title,
    subtitle: dto.description,
    status,
    startsAt: dto.startDate,
    resolvesAt: dto.endDate,
    markets: dto.markets.map((market) => ({
      id: market.id,
      eventId: dto.id,
      question: market.question,
      status: market.closed ? 'closed' : market.active ? 'open' : 'resolved',
      outcomes: market.outcomes.map((outcome) => ({
        id: outcome.id,
        label: outcome.label,
        price: outcome.price,
        probability: outcome.probability ?? Number(outcome.price),
      })),
    })),
  };
}
```

The specific mapping details will evolve, but the architectural rule does not: transformation belongs here, not in services or hooks.

## 4. Future KalshiAdapter

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

### Provider-specific freedom inside the boundary

The adapter interface does not force identical internal implementations. A Kalshi adapter may:

- omit proxy-wallet mechanics internally
- translate provider-specific order states into the canonical order result shape
- use different auth or signing models
- compose multiple APIs differently than Polymarket does

The only requirement is that callers continue to receive canonical Predict entities and capability-level methods.

## 5. Adding a New Provider

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

Illustrative shape:

```typescript
export type PredictProvider = 'polymarket' | 'kalshi';

export interface PredictAdapterFactory {
  create(provider: PredictProvider): PredictAdapter;
}
```

The factory is the seam where environment, feature flags, or account-specific provider selection can be resolved.

### Step 4: verify service compatibility

Run service integration tests against the new adapter contract. If service code needs provider-specific branching, that is a design smell. Prefer pushing that difference downward into the adapter.

### Step 5: add adapter integration tests

Test the new adapter at the provider boundary:

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
