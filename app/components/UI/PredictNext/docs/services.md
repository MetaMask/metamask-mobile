# PredictNext Service Architecture

This document describes the service layer for the PredictNext redesign. The service layer is where PredictNext becomes deep: reads, writes, orchestration, retries, state machines, transaction composition, and realtime coordination all live here rather than in components, hooks, or controllers.

Related documents:

- [architecture.md](./architecture.md)
- [adapters.md](./adapters.md)
- [state-management.md](./state-management.md)
- [error-handling.md](./error-handling.md)
- [testing.md](./testing.md)

## 1. Service Overview

PredictNext uses six services. Two are read-oriented `BaseDataService` implementations and four are plain services.

| Service              | Extends BaseDataService? | Approximate public interface size | What it hides                                                                                        |
| -------------------- | ------------------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `MarketDataService`  | Yes                      | 6 methods                         | query key definitions, cache strategy, retries, stale-time policy, provider pagination normalization |
| `PortfolioService`   | Yes                      | 5 methods                         | account read aggregation, cache policy, pagination normalization, background refresh behavior        |
| `TradingService`     | No                       | 5 methods + small readonly state  | order state machine, rate limiting, optimistic overlays, deposit-before-order chaining               |
| `TransactionService` | No                       | 3 methods                         | Permit2, EIP-712 signing, Safe proxy wallet flows, batch transaction building and submission         |
| `LiveDataService`    | No                       | 2 methods + connection status     | socket lifecycle, reconnection, multiplexing, channel fan-out, provider transport differences        |
| `AnalyticsService`   | No                       | 1 method                          | event normalization, session context injection, batching, provider-independent analytics vocabulary  |

The design intent is that each service exposes only the capabilities other modules must actually use. Internal helper methods, transport concerns, and workflow states remain private.

## 2. PredictController (Thin Orchestrator)

`PredictController` becomes a facade for write operations and lifecycle only. It is intentionally thin and should settle near ten public methods, not dozens.

### Controller responsibilities

- expose write operations through `Engine.context`
- initialize service graph and shared dependencies
- own feature lifecycle entrypoints
- hold session-scoped controller state that is not query-shaped

### Controller non-responsibilities

- serving read queries
- transforming provider payloads
- managing bespoke caches
- implementing retry loops
- owning transaction details
- directly implementing order state transitions

### Read path rule

Read operations do not go through `PredictController`. They go through `BaseDataService`-backed services registered directly with Engine and consumed by `useQuery` through messenger.

### Public controller interface

```typescript
export type Unsubscribe = () => void;

export type SubscriptionChannel =
  | 'marketPrices'
  | 'cryptoPrices'
  | 'gameUpdates';

export interface PreviewOrderParams {
  accountId: string;
  marketId: string;
  outcomeId: string;
  side: 'buy' | 'sell';
  amount: string;
  paymentTokenAddress?: string;
}

export interface PlaceOrderParams extends PreviewOrderParams {
  slippageBps?: number;
  requireDepositIfNeeded?: boolean;
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

export interface OrderPreview {
  marketId: string;
  outcomeId: string;
  estimatedShares: string;
  averagePrice: string;
  fee: string;
  requiresDeposit: boolean;
  totalCost: string;
}

export interface OrderResult {
  orderId: string;
  status: 'submitted' | 'filled' | 'partially_filled';
  txHashes: string[];
}

export interface TransactionResult {
  txHash: string;
  status: 'submitted' | 'confirmed';
}

export interface SubscriptionParams {
  marketId?: string;
  marketIds?: string[];
  eventId?: string;
}

export interface PredictController {
  previewOrder(params: PreviewOrderParams): Promise<OrderPreview>;
  placeOrder(params: PlaceOrderParams): Promise<OrderResult>;
  cancelOrder(orderId: string): Promise<void>;

  deposit(params: DepositParams): Promise<TransactionResult>;
  withdraw(params: WithdrawParams): Promise<TransactionResult>;
  claim(params: ClaimParams): Promise<TransactionResult>;

  subscribe(
    channel: SubscriptionChannel,
    params: SubscriptionParams,
  ): Unsubscribe;

  initialize(): Promise<void>;
  destroy(): void;
}
```

The controller surface stays intentionally small even if internal services are sophisticated. That is the point of the design.

```text
Hooks (read path)          Hooks (write path)
    |                          |
    |  [bypasses controller]   v
    |                    PredictController
    |                    (~10 methods)
    |                     /    |    \
    v                    v     v     v
MarketData  Portfolio  Trading Transaction LiveData Analytics
Service     Service    Service  Service    Service  Service
    \          \         |       |          /       /
     \_________ \________|_______|________/ ______/
                         |
                    PredictAdapter
```

## 3. MarketDataService (BaseDataService)

`MarketDataService` is the read model for market and discovery data.

### Why BaseDataService

Market data is shared server state:

- many screens consume it
- cache behavior matters
- stale/fresh semantics matter
- identical requests should dedupe automatically

`@metamask/base-data-service` gives PredictNext the correct shape for this problem:

- TanStack Query semantics at the service layer
- shared cache via messenger
- retries through Cockatiel policy
- circuit breaker behavior
- query-key-centric reads

### Registration model

`MarketDataService` registers with Engine messenger and exposes query methods that can be invoked by React hooks without passing through `PredictController`.

### Policy defaults

- `maxRetries: 2`
- `maxConsecutiveFailures: 3`

### Stale-time strategy

- prices: `1 minute`
- active event metadata: `5 minutes`
- resolved events: `1 hour`

### Replaces legacy complexity

`MarketDataService` replaces scattered mechanisms such as:

- `GameCache`
- `TeamsCache`
- custom pagination trackers
- view-owned fetch coordination

### Public interface

```typescript
export interface FetchEventsParams {
  cursor?: string;
  league?: string;
  status?: 'upcoming' | 'live' | 'resolved';
  sort?: 'featured' | 'volume' | 'endingSoon';
  limit?: number;
}

export interface SearchEventsParams {
  query: string;
  limit?: number;
}

export type TimePeriod = '1H' | '1D' | '1W' | '1M' | 'ALL';

export interface PredictOutcome {
  id: string;
  label: string;
  price: string;
  probability: number;
}

export interface PredictMarket {
  id: string;
  eventId: string;
  question: string;
  status: 'open' | 'closed' | 'resolved';
  outcomes: PredictOutcome[];
}

export interface PredictEvent {
  id: string;
  title: string;
  subtitle?: string;
  status: 'upcoming' | 'live' | 'resolved';
  markets: PredictMarket[];
  startsAt?: string;
  resolvesAt?: string;
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

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
}

export interface PredictMarketDataQueryKeys {
  getEvents(
    params: FetchEventsParams,
  ): ['PredictMarketData:getEvents', FetchEventsParams];
  getEvent(eventId: string): ['PredictMarketData:getEvent', string];
  getCarouselEvents(): ['PredictMarketData:getCarouselEvents'];
  searchEvents(
    params: SearchEventsParams,
  ): ['PredictMarketData:searchEvents', SearchEventsParams];
  getPriceHistory(
    marketId: string,
    period: TimePeriod,
  ): ['PredictMarketData:getPriceHistory', string, TimePeriod];
  getPrices(marketIds: string[]): ['PredictMarketData:getPrices', string[]];
}

export interface MarketDataService {
  getEvents(params: FetchEventsParams): Promise<PaginatedResult<PredictEvent>>;
  getEvent(eventId: string): Promise<PredictEvent>;
  getCarouselEvents(): Promise<PredictEvent[]>;
  searchEvents(params: SearchEventsParams): Promise<PredictEvent[]>;
  getPriceHistory(marketId: string, period: TimePeriod): Promise<PricePoint[]>;
  getPrices(marketIds: string[]): Promise<Map<string, MarketPrices>>;
}
```

### Query key contract

These keys are part of the public read contract between hooks and data services:

```typescript
const PredictMarketDataQueryKeys: PredictMarketDataQueryKeys = {
  getEvents: (params) => ['PredictMarketData:getEvents', params],
  getEvent: (eventId) => ['PredictMarketData:getEvent', eventId],
  getCarouselEvents: () => ['PredictMarketData:getCarouselEvents'],
  searchEvents: (params) => ['PredictMarketData:searchEvents', params],
  getPriceHistory: (marketId, period) => [
    'PredictMarketData:getPriceHistory',
    marketId,
    period,
  ],
  getPrices: (marketIds) => ['PredictMarketData:getPrices', marketIds],
};
```

The hook layer should never invent alternate keys for these reads.

## 4. PortfolioService (BaseDataService)

`PortfolioService` is the read model for account-specific prediction-market data.

### Responsibilities

- positions
- activity history
- balances
- unrealized profit and loss
- normalized account state for eligibility and funding UI

### Cache strategy

- positions: `1 minute`
- activity: `5 minutes`
- balance and account state: typically `1 minute`

Positions are relatively volatile during active trading, while activity is more append-only and tolerates a slightly longer stale window.

### Public interface

```typescript
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
  txHash?: string;
  description: string;
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

export interface PredictPortfolioQueryKeys {
  getPositions(accountId: string): ['PredictPortfolio:getPositions', string];
  getActivity(
    accountId: string,
    cursor?: string,
  ): ['PredictPortfolio:getActivity', string, string?];
  getBalance(accountId: string): ['PredictPortfolio:getBalance', string];
  getUnrealizedPnL(
    accountId: string,
  ): ['PredictPortfolio:getUnrealizedPnL', string];
  getAccountState(
    accountId: string,
  ): ['PredictPortfolio:getAccountState', string];
}

export interface PortfolioService {
  getPositions(accountId: string): Promise<PredictPosition[]>;
  getActivity(
    accountId: string,
    cursor?: string,
  ): Promise<PaginatedResult<ActivityItem>>;
  getBalance(accountId: string): Promise<Balance[]>;
  getUnrealizedPnL(accountId: string): Promise<string>;
  getAccountState(accountId: string): Promise<AccountState>;
}
```

### Query key contract

```typescript
const PredictPortfolioQueryKeys: PredictPortfolioQueryKeys = {
  getPositions: (accountId) => ['PredictPortfolio:getPositions', accountId],
  getActivity: (accountId, cursor) => [
    'PredictPortfolio:getActivity',
    accountId,
    cursor,
  ],
  getBalance: (accountId) => ['PredictPortfolio:getBalance', accountId],
  getUnrealizedPnL: (accountId) => [
    'PredictPortfolio:getUnrealizedPnL',
    accountId,
  ],
  getAccountState: (accountId) => [
    'PredictPortfolio:getAccountState',
    accountId,
  ],
};
```

## 5. TradingService (Plain Service)

`TradingService` owns the entire active-order workflow. This is one of the deepest modules in the system.

### State machine ownership

The order lifecycle is modeled inside `TradingService`, not in hooks or screens:

- `IDLE`
- `PREVIEWING`
- `DEPOSITING`
- `PLACING_ORDER`
- `SUCCESS`
- `ERROR`

The UI can render the current state, but it should not be responsible for deciding transitions.

```text
          +-------+          +------------+
          | ERROR | <------- | ANY STATE  |
          +-------+          +------------+
              |
              | (reset)
              v
          +-------+          +------------+
   +----> | IDLE  | <------> | PREVIEWING |
   |      +-------+          +------------+
   |          |                    |
   |          v                    |
   |      +------------+           |
   |      | DEPOSITING | <---------+
   |      +------------+
   |          |
   |          v
   |      +---------------+
   |      | PLACING_ORDER |
   |      +---------------+
   |          |
   |          v
   |      +---------+
   +----- | SUCCESS |
          +---------+
```

### Internal responsibilities

`TradingService` hides substantial complexity:

- rate limiting to at most one order every three seconds
- order preview lifecycle
- automatic deposit-and-order chaining when funding is insufficient
- optimistic position overlays before read cache catches up
- invalidation of market and portfolio query data after write completion
- analytics emission at preview, submit, success, and failure boundaries

### Public interface

```typescript
export type TradingStateStatus =
  | 'IDLE'
  | 'PREVIEWING'
  | 'DEPOSITING'
  | 'PLACING_ORDER'
  | 'SUCCESS'
  | 'ERROR';

export interface SelectedPaymentToken {
  tokenAddress: string;
  symbol: string;
}

export interface TradingState {
  status: TradingStateStatus;
  activePreview?: OrderPreview;
  lastOrderResult?: OrderResult;
  lastErrorCode?: PredictErrorCode;
}

export interface TradingService {
  readonly orderState: TradingState;
  readonly selectedPayment?: SelectedPaymentToken;

  previewOrder(params: PreviewOrderParams): Promise<OrderPreview>;
  placeOrder(params: PlaceOrderParams): Promise<OrderResult>;
  cancelOrder(orderId: string): Promise<void>;
  selectPaymentToken(token: SelectedPaymentToken): void;
  reset(): void;
}
```

### Hidden internals by design

The service may internally require many helpers:

- preview validator
- quote freshness checker
- funding evaluator
- rate limit gate
- order transition reducer
- optimistic overlay manager
- post-write invalidation planner

Those helpers should remain private because callers do not benefit from depending on them. The public API stays small even if the implementation is sophisticated.

## 6. TransactionService (Plain Service)

`TransactionService` owns blockchain transaction construction and execution for PredictNext account operations.

### Responsibilities

- deposits
- withdrawals
- claims
- transaction batching where supported
- signing and submission coordination
- provider-independent error normalization

### Internal complexity absorbed here

The UI and controller should never need to know whether a transaction requires:

- Safe proxy wallet interaction
- Permit2 approval
- EIP-712 signing
- multiple batched calls
- provider-specific calldata shape

That is exactly the complexity this module exists to hide.

### Public interface

```typescript
export enum PredictErrorCode {
  UNAVAILABLE = 'UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  QUOTE_EXPIRED = 'QUOTE_EXPIRED',
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
}

export class PredictError extends Error {
  constructor(
    public readonly code: PredictErrorCode,
    message: string,
    public readonly recoverable: boolean,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PredictError';
  }
}

export interface TransactionService {
  deposit(params: DepositParams): Promise<TransactionResult>;
  withdraw(params: WithdrawParams): Promise<TransactionResult>;
  claim(params: ClaimParams): Promise<TransactionResult>;
}
```

Every thrown error exposed from this service should be a `PredictError`. Lower-level exceptions should not escape the boundary.

## 7. LiveDataService (Plain Service)

`LiveDataService` owns realtime delivery for prediction-market updates.

### Responsibilities

- manage socket or stream connection lifecycle
- fan provider streams into stable channel abstractions
- multiplex multiple subscribers onto shared underlying connections
- reconnect with backoff
- expose a small, generic subscription API

### Public interface

```typescript
export type LiveDataConnectionStatus =
  | 'connected'
  | 'reconnecting'
  | 'disconnected';

export interface MarketPriceUpdate {
  marketId: string;
  bestBid?: string;
  bestAsk?: string;
  lastTradedPrice?: string;
  updatedAt: string;
}

export interface CryptoPriceUpdate {
  symbol: string;
  price: string;
  updatedAt: string;
}

export interface GameUpdate {
  eventId: string;
  status: 'upcoming' | 'live' | 'resolved';
  headline?: string;
  updatedAt: string;
}

export interface SubscriptionHandle<TData> {
  readonly status: LiveDataConnectionStatus;
  readonly data?: TData;
  unsubscribe(): void;
}

export interface LiveDataService {
  readonly connectionStatus: LiveDataConnectionStatus;

  subscribe<TData = unknown>(
    channel: SubscriptionChannel,
    params: SubscriptionParams,
    onData: (data: TData) => void,
  ): SubscriptionHandle<TData>;

  disconnect(): void;
}
```

### Channel set

Supported channels:

- `'marketPrices'`
- `'cryptoPrices'`
- `'gameUpdates'`

The channel abstraction is product-level. Whether a provider implements it through WebSocket, SSE, or polling fallback is an internal concern.

## 8. AnalyticsService (Plain Service)

`AnalyticsService` is a cross-cutting dependency used by other services.

### Responsibilities

- track Predict product events
- inject stable session and account context
- normalize naming across providers
- batch emissions when appropriate

### Public interface

```typescript
export type PredictAnalyticsEvent =
  | 'Predict Viewed Home'
  | 'Predict Viewed Event'
  | 'Predict Previewed Order'
  | 'Predict Placed Order'
  | 'Predict Order Failed'
  | 'Predict Deposited Funds'
  | 'Predict Withdrew Funds'
  | 'Predict Claimed Winnings'
  | 'Predict Live Data Reconnected';

export interface AnalyticsService {
  track(
    event: PredictAnalyticsEvent,
    properties: Record<string, unknown>,
  ): void;
}
```

Other services should depend on `AnalyticsService` through constructor injection and call `track()` at meaningful workflow boundaries. Views should rarely emit analytics directly.

## 9. Service Interaction Patterns

Services cooperate, but dependency directions stay disciplined.

### Dependency graph

Typical dependencies:

- `TradingService` → `TransactionService`
- `TradingService` → `AnalyticsService`
- `TradingService` → `MarketDataService` invalidation hooks
- `TradingService` → `PortfolioService` invalidation hooks
- `LiveDataService` → `AnalyticsService`
- `MarketDataService` → `PredictAdapter`
- `PortfolioService` → `PredictAdapter`
- `TransactionService` → `PredictAdapter`
- `LiveDataService` → `PredictAdapter`

```text
      TradingService          LiveDataService
       /   |   |   \           /      \
      v    v   v    v         v        v
  Transac Market Portfol Analytics  PredictAdapter
  Service  Data   folio   Service        ^
     |       \      /                    |
     +--------+----+---------------------+
```

`AnalyticsService` should not depend back on feature services. `PredictAdapter` should not depend upward on services.

### Constructor injection

Dependencies are provided explicitly.

```typescript
export interface TradingServiceDeps {
  transactionService: TransactionService;
  analyticsService: AnalyticsService;
  marketDataInvalidator: {
    invalidatePrices(marketIds: string[]): Promise<void>;
  };
  portfolioInvalidator: {
    invalidateAccount(accountId: string): Promise<void>;
  };
  adapter: {
    getOrderPreview(params: PreviewOrderParams): Promise<OrderPreview>;
    submitOrder(params: PlaceOrderParams): Promise<OrderResult>;
  };
}
```

Constructor injection keeps testing direct and makes boundaries explicit.

### BaseDataService registration

The read services register with Engine under a `DATA_SERVICES` convention. Hooks use those registrations through `@metamask/react-data-query` and messenger-driven query resolution.

Illustrative shape:

```typescript
export interface PredictDataServicesRegistry {
  PredictMarketData: MarketDataService;
  PredictPortfolio: PortfolioService;
}
```

This pattern gives PredictNext a shared data plane for reads while preserving a thin controller for writes.

### Guiding rule

If a new requirement introduces orchestration, retries, branching workflow state, or provider coordination, it belongs in a service. If it only translates a provider payload, it belongs in an adapter. If it only presents data, it belongs above the service layer.
