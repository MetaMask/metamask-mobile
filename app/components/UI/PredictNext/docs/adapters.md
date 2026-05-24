# PredictNext Adapter Layer

This document describes the adapter layer for PredictNext. Adapters are the seam between external prediction-market venues and the canonical Predict domain model used by services, hooks, and components.

Related documents:

- [architecture.md](./architecture.md)
- [services.md](./services.md)
- [error-handling.md](./error-handling.md)
- [testing.md](./testing.md)
- [../CONTEXT.md](../CONTEXT.md)

## 1. Adapter Pattern Overview

Adapters translate venue-specific APIs into Predict's canonical model:

- `PredictEvent`
- `PredictMarket`
- `PredictOutcome`
- `PredictPosition`
- `ActivityItem`
- `OrderPreview`
- `ReferencePrice`
- `TransactionBatch`

The adapter layer exists so the rest of PredictNext never depends on:

- venue-specific DTOs
- endpoint naming
- authentication headers and API-key mechanics
- socket transport details
- venue-specific account models
- Polymarket-specific naming such as `conditionId`, `clobTokenIds`, or Safe/deposit-wallet payload shapes

### Target shape

Each adapter should expose a small capability-oriented interface. The methods are fetch, transform, build, submit, or subscribe operations only.

Adapters do:

- call remote APIs or SDKs
- transform remote payloads into canonical Predict entities
- build venue-specific order or transaction payloads
- submit venue-specific orders
- create live data subscriptions
- keep lightweight auth/session primitives required by a venue SDK

Adapters do not:

- cache query results
- retry transient failures
- orchestrate multi-step workflows
- manage UI-facing state
- emit analytics
- decide product behavior
- own rate limiting
- own optimistic portfolio cache patches
- own active-order state transitions

The rest of PredictNext treats adapters as swappable protocol implementations behind a stable domain contract.

```text
 [ Service ]           [ Adapter ]           [ Venue API ]
      |                     |                      |
      |--- call method ---->|                      |
      |                     |--- request --------->|
      |                     |                      |
      |                     |<-- venue DTO ------|
      |                     |                      |
      |                     | [ Transform DTO ]    |
      |                     | [ to PredictType ]   |
      |                     |                      |
      |<-- PredictType -----|                      |
```

Adding a new venue should primarily mean implementing one interface and registering it in the adapter factory.

## 2. Naming Rules

Use different verbs at each layer so responsibility is visible from the call site.

| Layer                       | Verb pattern                                                           | Example                                        |
| --------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------- |
| Adapter                     | venue boundary verbs: `fetch`, `build`, `submit`, `createSubscription` | `fetchEvents`, `buildDepositTx`, `submitOrder` |
| Service                     | product capability verbs: `get`, `preview`, `place`, `deposit`         | `getEvents`, `previewOrder`, `placeOrder`      |
| Legacy `PolymarketProvider` | old public names retained during migration                             | `getMarkets`, `getMarketDetails`, `placeOrder` |

During migration, legacy `PolymarketProvider` methods keep their legacy names and delegate downward:

```text
PolymarketProvider.getMarkets()
  → PolymarketAdapter.fetchEvents()
  → PredictNext/compat.toOldMarket()
  → legacy PredictMarket[]
```

This keeps existing hooks and UI stable while the new adapter becomes the implementation source.

## 3. PredictAdapter Interface

The `PredictAdapter` contract defines the venue seam for the redesigned feature. The exact TypeScript implementation will live in `app/components/UI/PredictNext/adapters/types.ts`; this sketch is the intended shape.

### Canonical type rule during migration

The canonical entities must be rich enough to preserve old UI behavior while old screens are still rendering from legacy types. The migration plan depends on canonical and legacy shapes being effectively isomorphic, with naming corrected:

| Legacy type           | Canonical type   |
| --------------------- | ---------------- |
| `PredictMarket`       | `PredictEvent`   |
| `PredictOutcome`      | `PredictMarket`  |
| `PredictOutcomeToken` | `PredictOutcome` |

Do not introduce a thin canonical event type that drops fields needed by old UI. If the old UI needs a field, either carry it in the canonical model or explicitly mark it as a venue-specific extension that compat mappers preserve.

```typescript
export type Unsubscribe = () => void;

export type PredictVenueId = 'polymarket' | 'kalshi';

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

export interface PredictTeam {
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
  homeTeam: PredictTeam;
  awayTeam: PredictTeam;
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
  venueId: PredictVenueId;
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
  venueId: PredictVenueId;
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
  /** Optional sports Game metadata for sports Events. */
  game?: PredictGame;
  series?: PredictSeries;
  /** Venue parent Event used to merge extended sports child Events into one canonical Event. */
  parentEventId?: string | number | null;
  /** Venue child Events whose Markets were merged into this canonical Event. */
  childEventIds?: string[];
  isHighlighted?: boolean;
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface CryptoPricePoint {
  timestamp: number;
  value: number;
}

export interface CryptoPriceHistoryParams {
  symbol: string;
  eventStartTime: string;
  variant: string;
  endDate?: string;
}

export interface CryptoReferencePriceParams {
  eventId: string;
  symbol: string;
  eventStartTime: string;
  variant: string;
  endDate: string;
}

export type ReferencePrice = number;

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
  venueId: PredictVenueId;
  results: PriceResult[];
}

export interface PredictPosition {
  id: string;
  venueId: PredictVenueId;
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
  venueId: PredictVenueId;
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
  /** The venue-side trading address used for data queries and order submission. */
  venueAccountAddress: string;
  /** Present when the venue uses a proxy wallet. */
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
    venueFee: number;
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
  venueOrderId?: string;
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
  venueAccountAddress?: string;
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

export interface VenueCapabilities {
  supportsDeposits: boolean;
  supportsWithdrawals: boolean;
  supportsClaims: boolean;
  supportsProxyWallet: boolean;
  supportsLivePrices: boolean;
  supportsOrderbook: boolean;
  supportsCryptoReferencePrices: boolean;
}

/**
 * Complete venue boundary contract. Methods are intentionally non-optional;
 * services branch on capabilities, not method existence.
 */
export interface PredictAdapter {
  readonly venueId: PredictVenueId;
  readonly capabilities: VenueCapabilities;

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
  fetchCryptoPriceHistory(
    params: CryptoPriceHistoryParams,
  ): Promise<CryptoPricePoint[]>;
  fetchCryptoReferencePrice(
    params: CryptoReferencePriceParams,
  ): Promise<ReferencePrice | null>;
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

The adapter interface spans the venue boundary for three reasons:

1. services need one place to get venue capabilities
2. the rest of the system should not depend on venue SDKs
3. adding a venue should not force new abstractions into higher layers

Every concrete adapter implements the complete interface. Methods are not optional because optional methods push venue branching into services and hooks. Instead, callers read `adapter.capabilities` before invoking a capability-specific method. If unsupported code is called anyway, the adapter throws `PredictErrorCode.UNSUPPORTED_VENUE_CAPABILITY`; `PredictErrorCode.VENUE_UNAVAILABLE` is reserved for venue outages or unreachable venue APIs. Crypto up/down auxiliary price methods are part of the same complete contract because they are venue data dependencies, not UI helpers.

Even so, the interface remains shallow. It describes venue capabilities, not workflows. For example, `submitOrder()` exists, but `depositThenSubmitOrder()` does not. That workflow belongs in `TradingService`, not in the adapter.

## 4. PolymarketAdapter Implementation

`PolymarketAdapter` is the initial concrete adapter for PredictNext.

### Venue surfaces used

Polymarket requires multiple underlying APIs and transports:

- Gamma API for event and market discovery
- CLOB API for price history, orderbook, previewing, and order submission
- Polymarket crypto price endpoints for crypto up/down price history and reference prices
- Polymarket data/account endpoints for balances, positions, activity, and PnL
- WebSocket feeds for live price, orderbook, sports game, and crypto price updates
- on-chain helpers for balances and venue transaction construction

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
- Polymarket sports metadata becomes optional `PredictGame` and `PredictTeam` metadata on `PredictEvent`
- Polymarket extended sports child events become grouped `PredictMarket` entries on one canonical parent `PredictEvent`, with `parentEventId` and `childEventIds` preserving provenance
- account holdings become `PredictPosition`
- fills, deposits, withdrawals, and claims become `ActivityItem`

### Authentication and venue account responsibility

Authentication details and venue account resolution stay inside the adapter seam.

Examples:

- CLOB API-key creation and lookup
- L2 header construction
- CLOB signing requirements
- account-specific headers or session configuration
- Polymarket Safe/deposit-wallet address derivation
- venue activity checks required to choose the right venue account

Services can request capabilities like `fetchAccountState()`, `getOrderPreview()`, or `submitOrder()` without knowing how Polymarket authenticates those calls or resolves the user's venue account.

### Stateful workflow exclusions

Several current `PolymarketProvider` responsibilities must not be blindly moved into the adapter:

| Current responsibility in `PolymarketProvider` | Target owner                                                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| order rate limiting                            | `TradingService`                                                                                           |
| active-order state machine                     | `TradingService` / controller session state                                                                |
| optimistic position overlays                   | `TradingService` emits Service Events; `PortfolioService` owns cache patches, reconciliation, and rollback |
| deposit-before-order chaining                  | `TradingService` + `TransactionService`                                                                    |
| transaction status side effects                | `TransactionService` / controller integration                                                              |
| analytics                                      | `AnalyticsService`                                                                                         |
| retries and cache fallback                     | BaseDataService-backed services                                                                            |

Phase 2 may temporarily leave these responsibilities in the legacy `PolymarketProvider` while it delegates lower-level reads and venue requests to the adapter. They move to services in Phases 3 and 4.

### Example transformation

This sketch intentionally uses canonical names while preserving enough fields for legacy UI parity.

```typescript
function mapPolymarketEvent(dto: PolymarketGammaEventDto): PredictEvent {
  const markets = dto.markets.map((market) => ({
    id: market.conditionId,
    venueId: 'polymarket',
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
    venueId: 'polymarket',
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

`KalshiAdapter` is the expected next venue adapter implementation. The existing `PredictAdapter` interface is designed to support it without changing higher layers.

### Same contract, different transport and semantics

Kalshi is likely to differ from Polymarket in several important ways:

- direct trading rather than a proxy wallet flow
- different order types and preview semantics
- different account and position models
- SSE or another streaming mechanism instead of the same WebSocket contract

Those differences should remain inside `KalshiAdapter`.

### How the interface accommodates venue differences

The contract is intentionally phrased in product capabilities, not venue implementation details.

Examples:

- `submitOrder()` does not require callers to know how the venue executes the order
- `buildDepositTx()` may return a trivial or empty batch if the venue supports deposits through a different funding flow, or throw `UNSUPPORTED_VENUE_CAPABILITY` when deposits are not supported
- `createSubscription()` abstracts whether the venue uses WebSocket, SSE, or another push channel
- `fetchAccountState()` normalizes eligibility and setup conditions into a Predict-friendly shape

This means the service layer can remain stable even when venues differ substantially.

### Venue-specific freedom inside the seam

The adapter interface does not force identical internal implementations. A Kalshi adapter may:

- omit proxy-wallet mechanics internally
- translate venue-specific order states into the canonical order result shape
- use different auth or signing models
- compose multiple APIs differently than Polymarket does

The only requirement is that callers continue to receive canonical Predict entities and capability-level methods.

## 6. Adding a New Venue

Adding a venue should be a bounded infrastructure change, not a feature-wide rewrite.

### Step 1: implement `PredictAdapter`

Create a concrete adapter that fulfills the full `PredictAdapter` interface. Every returned value must be canonical Predict domain data, not venue DTOs.

### Step 2: add venue configuration

Define adapter-specific configuration such as:

- base URLs
- auth settings
- chain and token defaults
- supported live-data channels
- venue capability flags if needed for internal adapter decisions

### Step 3: register in the adapter factory

Use a venue key to resolve the correct adapter implementation.

```typescript
export type PredictVenueId = 'polymarket' | 'kalshi';

export interface PredictAdapterFactory {
  create(venueId: PredictVenueId): PredictAdapter;
}
```

The factory is the seam where environment, feature flags, or account-specific venue selection can be resolved.

### Step 4: verify service compatibility

Run service integration tests against the new adapter contract. If service code needs venue-specific branching, that is a design smell. Prefer pushing that difference downward into the adapter.

### Step 5: add adapter integration tests

Test the new adapter at the venue seam:

- HTTP payload mapping
- account mapping
- order preview mapping
- transaction batch construction
- live data subscription translation

### Acceptance rule for new venues

A new venue integration is architecturally successful when:

- hooks do not change
- components do not change
- controller shape does not change
- service public interfaces do not change
- only adapter implementation and venue configuration need significant work

That is the payoff of keeping adapters thin, services deep, and the public Predict model canonical.
