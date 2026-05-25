# PredictNext Client and Adapter Layer

This document describes the venue boundary for PredictNext. The boundary is defined by a single canonical contract: `VenueAdapter`. Product services hold a session-bound view of it (the `PredictClient` type, derived from `VenueAdapter`) returned by `PredictSessionService`. Venue-specific adapters implement `VenueAdapter` and translate external prediction-market APIs into the canonical Predict domain model.

Related documents:

- [interface-ledger.md](./interface-ledger.md) — runtime namespace and PriceQuery rules consumed above the Venue seam
- [architecture.md](./architecture.md)
- [services.md](./services.md)
- [error-handling.md](./error-handling.md)
- [testing.md](./testing.md)
- [../CONTEXT.md](../CONTEXT.md)

## 1. Venue Adapter Pattern Overview

> The single-sentence canonical framing of `PredictClient` and `VenueAdapter` is owned by [interface-ledger.md §1.5](./interface-ledger.md#15-predictclient-and-venueadapter--canonical-framing). The expanded explanation below is consistent with the ledger; if they ever disagree, the ledger wins.

The venue boundary has **one canonical contract**: `VenueAdapter`. Each venue (Polymarket, future Kalshi) implements that contract as a stateless protocol translator. Product services never see venue-specific DTOs, endpoint names, auth headers, or socket transports — only canonical Predict entities:

- `PredictEvent`
- `PredictMarket`
- `PredictOutcome`
- `PredictPosition`
- `ActivityItem`
- `OrderPreview`
- `ReferencePrice`
- `FundingPlan`
- `FundingReceipt`

### Why one contract, not two

A previous iteration of this design defined two parallel interfaces: `PredictClient` (consumed by product services) and `VenueAdapter` (implemented by venues). Their methods were structurally identical — every adapter method took a trailing `session: PredictVenueSession` parameter, and every client method was a same-name forward that injected its bound session. The client was a shallow module: ~25 forwarding methods, each adding nothing except session injection. Two interfaces drifted in lockstep; every venue-capability change had to be made twice.

PredictNext collapses these to one contract. `VenueAdapter` is the only hand-written interface. The product-facing handle (`PredictClient`) is a session-bound view of `VenueAdapter`, expressed as a derived type so it cannot drift from the canonical contract:

```typescript
// Canonical contract — stateless, takes session per method.
export interface VenueAdapter {
  readonly venueId: PredictVenueId;
  readonly capabilities: VenueCapabilities;

  getVenueInfo(): PredictVenueInfo;

  fetchEvents(
    params: FetchEventsParams,
    session: PredictVenueSession,
  ): Promise<PaginatedResult<PredictEvent>>;

  // … and so on for every venue capability.
}

// PredictClient is the session-bound view product services hold.
// It is derived from VenueAdapter by binding the trailing session parameter.
// PredictSessionService produces a runtime proxy that matches this type.
type StripSession<T> = T extends (
  ...args: [...infer Rest, PredictVenueSession]
) => infer R
  ? (...args: Rest) => R
  : T;

export type PredictClient = {
  readonly venueId: VenueAdapter['venueId'];
  readonly capabilities: VenueAdapter['capabilities'];
} & {
  [K in keyof VenueAdapter as VenueAdapter[K] extends (...args: any[]) => any
    ? K
    : never]: StripSession<VenueAdapter[K]>;
};
```

There is no separately maintained `PredictClient` interface. Adding a venue capability means adding one method to `VenueAdapter`; `PredictClient` updates automatically.

### What `PredictSessionService` does at the seam

Product services obtain a `PredictClient` through `PredictSessionService.getClient(ownerAddress, venueId?)`. The session service is the only thing that knows about `PredictVenueSession`: it resolves the active adapter, ensures a valid session, and returns a session-bound proxy of that adapter. Services treat clients as operation-scoped — ask the session service for a client at the start of each venue operation so the session can be validated or refreshed first.

```text
 [ Product Service ]    [ PredictSessionService ]   [ active VenueAdapter ]   [ Venue API ]
         |                         |                          |                     |
         |--- getClient(owner) --->|                          |                     |
         |                         |                          |                     |
         |                         |  binds session to        |                     |
         |                         |  VenueAdapter methods    |                     |
         |                         |                          |                     |
         |<------ PredictClient ---|                          |                     |
         |  (bound view of adapter)                           |                     |
         |                                                    |                     |
         |--- client.fetchEvents(params) --------------------->| (internally:        |
         |                                                    |  adapter.fetchEvents|
         |                                                    |   (params, session))|
         |                                                    |--- request -------->|
         |                                                    |<-- DTO -------------|
         |<-- canonical PredictEvent[] -----------------------|                     |
```

### What `VenueAdapter` does

- call remote APIs or SDKs
- transform remote payloads into canonical Predict entities
- build venue-specific order or transaction payloads from explicit params and the session argument
- submit venue-specific orders from explicit params and the session argument
- create live data subscriptions

### What `VenueAdapter` does not do

- expose a product-facing API directly to services, hooks, or components
- get imported anywhere outside `PredictSessionService` and the adapters package
- cache query results
- own auth/session state (the session is a parameter, never a field)
- resolve signers from app state
- retry transient failures
- orchestrate multi-step product workflows
- manage UI-facing state
- emit analytics
- decide product behavior
- own rate limiting
- own optimistic portfolio cache patches
- own active-order state transitions
- expose legacy `Signer` objects or require callers to pass signing functions through venue methods

Adapter implementations are swappable details behind one contract. Adding a new venue means implementing `VenueAdapter` and registering it; nothing higher up in the stack changes shape.

## 2. Naming Rules

Use different verbs at each layer so responsibility is visible from the call site.

| Layer                                      | Verb pattern                                                                                                        | Example                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `VenueAdapter` (the canonical contract)    | venue capability verbs returning canonical types or plans: `fetch`, `get`, `create`, `submit`, `createSubscription` | `fetchEvents`, `getOrderPreview`, `createDepositPlan`, `submitOrder` |
| Adapter implementation internals (private) | protocol verbs hidden inside the adapter                                                                            | `fetchGammaEvents`, `submitClobOrder`                                |
| Service                                    | product workflow verbs: `get`, `preview`, `place`, `deposit`                                                        | `getEvents`, `previewOrder`, `placeOrder`                            |
| Legacy `PolymarketProvider`                | old public names retained during migration                                                                          | `getMarkets`, `getMarketDetails`, `placeOrder`                       |

`PredictClient` carries the same verbs as `VenueAdapter` because it is the session-bound view of `VenueAdapter` — no separate naming layer to maintain.

During migration, legacy `PolymarketProvider` methods keep their legacy names and delegate downward:

```text
PolymarketProvider.getMarkets()
  → PredictSessionService.getClient(ownerAddress)        // returns bound view of VenueAdapter
  → client.fetchEvents()                                  // method derived from VenueAdapter
  → internal Polymarket VenueAdapter implementation
  → PredictNext/compat.toOldMarket()
  → legacy PredictMarket[]
```

This keeps existing hooks and UI stable while the new venue adapter becomes the implementation source.

## 3. Venue Adapter Interface

The `VenueAdapter` contract defines the venue seam for the redesigned feature. The exact TypeScript contract will live in `app/components/UI/PredictNext/adapters/types.ts`. `PredictClient` is a derived type alias declared alongside it. The bound-view runtime proxy lives in `app/components/UI/PredictNext/session/PredictSessionService.ts` (it is created by the session service, not the adapter). Concrete adapter implementations live under `app/components/UI/PredictNext/adapters/{venueId}/` and are not exported from the public PredictNext API.

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
  /** Cursor for fetching the next page when the endpoint is cursor-based. */
  cursor?: string | null;
  /** Total result count when the endpoint is page-based and exposes one. */
  totalResults?: number;
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

export type DecimalString = string;

export interface PredictOutcome {
  /** Tradeable side of a binary Market. Legacy equivalent: PredictOutcomeToken. */
  id: string;
  label: string;
  shortLabel?: string;
  /** Decimal string price/probability in the range 0-1, e.g. "0.65". */
  price: DecimalString;
}

export interface PredictMarket {
  /** Single binary question within an Event. Legacy equivalent: PredictOutcome. */
  id: string;
  venueId: PredictVenueId;
  eventId: string;
  title: string;
  description?: string;
  image?: string;
  status: 'upcoming' | 'open' | 'paused' | 'closed' | 'resolved' | 'settled';
  resolution?: PredictMarketResolution;
  active?: boolean;
  acceptingOrders?: boolean;
  outcomes: PredictOutcome[];
  /** Settlement-currency decimal string. */
  volume: DecimalString;
  /** Settlement-currency decimal string. */
  liquidity?: DecimalString;
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
  status:
    | 'upcoming'
    | 'live'
    | 'open'
    | 'paused'
    | 'closed'
    | 'resolved'
    | 'settled';
  active?: boolean;
  recurrence?: string;
  category?: string;
  tags: string[];
  markets: PredictMarket[];
  marketGroups?: PredictMarketGroup[];
  /** Settlement-currency decimal string. */
  liquidity: DecimalString;
  /** Settlement-currency decimal string. */
  volume: DecimalString;
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
  price: DecimalString;
}

export interface CryptoPricePoint {
  timestamp: number;
  value: DecimalString;
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

export type ReferencePrice = DecimalString;

export interface PriceQuery {
  eventId: string;
  marketId: string;
  outcomeId: string;
}

export interface PriceResult {
  eventId: string;
  marketId: string;
  outcomeId: string;
  buy: DecimalString;
  sell: DecimalString;
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
  /** Settlement-currency decimal string. */
  currentValue: DecimalString;
  title: string;
  icon: string;
  /** Settlement-currency decimal string. */
  amount: DecimalString;
  /** Decimal string price/probability in the range 0-1. */
  price: DecimalString;
  status: 'open' | 'redeemable' | 'won' | 'lost';
  /** Outcome share quantity as a decimal string. */
  size: DecimalString;
  outcomeIndex: number;
  realizedPnl?: DecimalString;
  percentPnl: DecimalString;
  cashPnl: DecimalString;
  claimable: boolean;
  initialValue: DecimalString;
  averageEntryPrice: DecimalString;
  endDate: string;
  negRisk?: boolean;
  optimistic?: boolean;
}

export interface ActivityItem {
  id: string;
  venueId: PredictVenueId;
  type: 'buy' | 'sell' | 'claim' | 'settlement' | 'deposit' | 'withdrawal';
  timestamp: number;
  eventId?: string;
  marketId?: string;
  outcomeId?: string;
  /** Settlement-currency decimal string. */
  amount?: DecimalString;
  /** Decimal string price/probability in the range 0-1. */
  price?: DecimalString;
  txHash?: string;
  title?: string;
  outcomeLabel?: string;
  icon?: string;
}

export interface PredictBalance {
  venueId: PredictVenueId;
  ownerAddress: string;
  /** Settlement-currency decimal string, e.g. "0.56". */
  amount: DecimalString;
}

export interface PredictSettlementCurrency {
  symbol: string;
  decimals: number;
  tokenAddress?: string;
  chainId?: string;
}

export interface PredictVenueInfo {
  venueId: PredictVenueId;
  name: string;
  settlementCurrency: PredictSettlementCurrency;
  capabilities: VenueCapabilities;
}

export interface PredictVenueStatus {
  venueId: PredictVenueId;
  status: 'available' | 'degraded' | 'unavailable';
  checkedAt: number;
  reason?: PredictErrorCode;
}

export interface PredictMarketResolution {
  state: 'none' | 'determined' | 'disputed' | 'finalized';
  winningOutcomeId?: string;
  settledAt?: string;
  claimable?: boolean;
}

export type PredictAccountReadinessStatus =
  | 'ready'
  | 'setup_required'
  | 'setup_pending'
  | 'restricted'
  | 'unavailable';

export type PredictAccountReadinessBlockerCode =
  | 'account_setup_required'
  | 'account_setup_pending'
  | 'kyc_required'
  | 'kyc_pending'
  | 'kyc_rejected'
  | 'jurisdiction_restricted'
  | 'geo_blocked'
  | 'venue_unavailable'
  | 'unknown';

export interface PredictAccountReadinessBlocker {
  code: PredictAccountReadinessBlockerCode;
  message?: string;
  action?: 'complete_setup' | 'complete_kyc' | 'retry';
}

export interface PredictAccountReadiness {
  venueId: PredictVenueId;
  /** The user's MetaMask account address. */
  ownerAddress: string;
  /** Product-level account readiness. Venue account addresses stay session internals. */
  canTrade: boolean;
  status: PredictAccountReadinessStatus;
  blockers?: PredictAccountReadinessBlocker[];
}

export interface PredictSigner {
  readonly address: string;
  signTypedMessage(...args: unknown[]): Promise<string>;
  signPersonalMessage(...args: unknown[]): Promise<string>;
}

/** Owned by PredictSessionService, not by product services or venue adapters. */
export interface PredictSignerProvider {
  getSigner(ownerAddress: string): Promise<PredictSigner>;
}

/** Internal session context created from a venue adapter and owned by PredictSessionService. */
export interface PredictVenueSession {
  venueId: PredictVenueId;
  /** The user's MetaMask account address. */
  ownerAddress: string;
  /** Optional expiry for venue credentials or session material. */
  expiresAt?: number;
  /** Opaque venue-specific auth/account/readiness context. Only the adapter that created it interprets it. */
  data: unknown;
}

export interface PredictSessionService {
  getClient(
    ownerAddress: string,
    venueId?: PredictVenueId,
  ): Promise<PredictClient>;
  invalidate(ownerAddress: string, venueId?: PredictVenueId): void;
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
  limit?: number;
  offset?: number;
  claimable?: boolean;
  eventId?: string;
  marketId?: string;
}

export interface PreviewParams {
  eventId: string;
  marketId: string;
  outcomeId: string;
  side: 'buy' | 'sell';
  /** Buy spend amount or sell share quantity as a decimal string. */
  size: DecimalString;
  positionId?: string;
  paymentTokenAddress?: string;
}

export interface SubmitOrderParams {
  preview: OrderPreview;
  slippageBps?: number;
}

export interface OrderPreview {
  eventId: string;
  marketId: string;
  outcomeId: string;
  timestamp: number;
  side: 'buy' | 'sell';
  sharePrice: DecimalString;
  /** Buy side: max settlement-currency amount spent; sell side: max shares sold. */
  maxAmountSpent: DecimalString;
  /** Buy side: min shares received; sell side: min settlement-currency amount received. */
  minAmountReceived: DecimalString;
  slippage: DecimalString;
  tickSize: DecimalString;
  minOrderSize: DecimalString;
  negRisk: boolean;
  feeRateBps?: string;
  fees?: {
    metamaskFee: DecimalString;
    venueFee: DecimalString;
    marketFee?: DecimalString;
    totalFee: DecimalString;
    totalFeePercentage: DecimalString;
  };
  rateLimited?: boolean;
  positionId?: string;
  orderType?: 'FOK' | 'FAK';
}

export interface OrderReceipt {
  orderId: string;
  status: 'submitted' | 'filled' | 'partially_filled';
  venueOrderId?: string;
  spentAmount: DecimalString;
  receivedAmount: DecimalString;
  txHashes: string[];
}

export type ChainNamespace = 'eip155' | 'solana';

export type FundingOperation = 'deposit' | 'withdraw' | 'claim';

export type FundingPlan =
  | {
      kind: 'wallet_transfer';
      venueId: PredictVenueId;
      operation: FundingOperation;
      network: ChainNamespace;
      amount: DecimalString;
      settlementCurrency: PredictSettlementCurrency;
      request: ChainTransactionRequest;
      venueReference?: string;
      afterSubmit?: { type: 'deposit_indication'; required: true };
    }
  | {
      kind: 'venue_api';
      venueId: PredictVenueId;
      operation: FundingOperation;
      amount?: DecimalString;
      requestPreview: Record<string, unknown>;
      venueReference?: string;
    }
  | {
      kind: 'unsupported';
      venueId: PredictVenueId;
      operation: FundingOperation;
      reason: PredictErrorCode.UNSUPPORTED_VENUE_CAPABILITY;
    };

export interface FundingReceipt {
  venueId: PredictVenueId;
  operation: FundingOperation;
  status: 'submitted' | 'confirmed' | 'processing' | 'prefunded' | 'failed';
  amount?: DecimalString;
  txHash?: string;
  venueReference?: string;
}

export type CreateDepositPlanParams =
  | {
      tokenAddress?: string;
      /**
       * Returns a valid zero-amount transfer template that the confirmation /
       * Transaction Pay flow can edit later. Required for legacy
       * `prepareDeposit` parity during migration.
       */
      mode: 'editable-template';
      amount?: never;
    }
  | {
      tokenAddress?: string;
      /** Returns a final amount-specific Funding Plan. */
      mode: 'fixed-amount';
      amount: DecimalString;
      destinationAddress?: string;
      network?: ChainNamespace;
    };

export type CreateWithdrawPlanParams =
  | {
      tokenAddress?: string;
      /**
       * Returns a valid zero-amount transfer template that the confirmation /
       * Transaction Pay flow can edit later. Required for legacy
       * `prepareWithdraw` parity during migration.
       */
      mode: 'editable-template';
      amount?: never;
    }
  | {
      tokenAddress?: string;
      /** Returns the final venue withdrawal Funding Plan. */
      mode: 'fixed-amount';
      amount: DecimalString;
      destinationAddress: string;
      network?: ChainNamespace;
    };

export interface ClaimParams {
  positions: PredictPosition[];
}

export type ChainTransactionRequest =
  | {
      namespace: 'eip155';
      chainId: string;
      to: string;
      data: string;
      value?: string;
      gas?: string;
      type?: string;
    }
  | {
      namespace: 'solana';
      cluster: 'mainnet' | 'devnet';
      /** Recipient address for a simple SPL token transfer, e.g. a venue deposit address. */
      to: string;
      /** SPL token mint address, e.g. USDC on Solana. */
      tokenMint: string;
      amount: DecimalString;
      /** Optional prebuilt instructions when a simple token transfer is insufficient. */
      instructions?: unknown[];
    };

/** Backwards-compatible EVM-only plan shape for legacy migration call sites. */
export type EvmWalletTransferPlan = Extract<
  FundingPlan,
  { kind: 'wallet_transfer'; network: 'eip155' }
>;

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
  supportsAutomaticSettlement: boolean;
  supportsAccountSetup: boolean;
  supportsLivePrices: boolean;
  supportsOrderbook: boolean;
  supportsCryptoReferencePrices: boolean;
}

// Scope rule: `VenueCapabilities` describes only product-visible features that
// UI or product services branch on. Venue mechanics — proxy wallets, signing
// schemes, transaction shape, settlement currency mode — stay below the
// adapter seam and are never exposed as capability flags.

/**
 * The canonical venue contract. Stateless: each method takes a
 * PredictVenueSession as its trailing parameter rather than holding session
 * state on the instance. Implemented once per venue (PolymarketAdapter,
 * future KalshiAdapter). Methods are intentionally non-optional; services
 * branch on `capabilities`, not on method existence.
 */
export interface VenueAdapter {
  readonly venueId: PredictVenueId;
  readonly capabilities: VenueCapabilities;

  getVenueInfo(): PredictVenueInfo;

  /** Stateless: creates session material from explicit signer input but does not cache it. */
  createSession(params: {
    ownerAddress: string;
    signer: PredictSigner;
  }): Promise<PredictVenueSession>;

  fetchVenueStatus(session: PredictVenueSession): Promise<PredictVenueStatus>;

  fetchEvents(
    params: FetchEventsParams,
    session: PredictVenueSession,
  ): Promise<PaginatedResult<PredictEvent>>;
  fetchEvent(
    eventId: string,
    session: PredictVenueSession,
  ): Promise<PredictEvent>;
  fetchEventsByIds(
    eventIds: string[],
    session: PredictVenueSession,
  ): Promise<PredictEvent[]>;
  fetchCarouselEvents(session: PredictVenueSession): Promise<PredictEvent[]>;
  searchEvents(
    params: SearchEventsParams,
    session: PredictVenueSession,
  ): Promise<PaginatedResult<PredictEvent>>;
  fetchEventSeries(
    params: {
      seriesId: string;
      endDateMin: string;
      endDateMax: string;
      limit?: number;
    },
    session: PredictVenueSession,
  ): Promise<PredictEvent[]>;
  fetchPriceHistory(
    params: {
      marketId: string;
      period?: TimePeriod;
      fidelity?: number;
      interval?: string;
      startTs?: number;
      endTs?: number;
    },
    session: PredictVenueSession,
  ): Promise<PricePoint[]>;
  fetchCryptoPriceHistory(
    params: CryptoPriceHistoryParams,
    session: PredictVenueSession,
  ): Promise<CryptoPricePoint[]>;
  fetchCryptoReferencePrice(
    params: CryptoReferencePriceParams,
    session: PredictVenueSession,
  ): Promise<ReferencePrice | null>;
  fetchPrices(
    params: { queries: PriceQuery[] },
    session: PredictVenueSession,
  ): Promise<MarketPrices>;

  getOrderPreview(
    params: PreviewParams,
    session: PredictVenueSession,
  ): Promise<OrderPreview>;
  fetchPositions(
    params: FetchPositionsParams,
    session: PredictVenueSession,
  ): Promise<PredictPosition[]>;
  fetchActivity(
    params: { cursor?: string },
    session: PredictVenueSession,
  ): Promise<PaginatedResult<ActivityItem>>;
  fetchBalance(session: PredictVenueSession): Promise<PredictBalance>;
  fetchUnrealizedPnL(
    session: PredictVenueSession,
  ): Promise<{ cashPnl: DecimalString; percentPnl: DecimalString }>;
  fetchAccountReadiness(
    params: { forceRefresh?: boolean } | undefined,
    session: PredictVenueSession,
  ): Promise<PredictAccountReadiness>;

  submitOrder(
    params: SubmitOrderParams,
    session: PredictVenueSession,
  ): Promise<OrderReceipt>;
  createDepositPlan(
    params: CreateDepositPlanParams,
    session: PredictVenueSession,
  ): Promise<FundingPlan>;
  createWithdrawPlan(
    params: CreateWithdrawPlanParams,
    session: PredictVenueSession,
  ): Promise<FundingPlan>;
  createClaimPlan(
    params: ClaimParams,
    session: PredictVenueSession,
  ): Promise<FundingPlan>;
  submitFundingFollowUp(
    receipt: FundingReceipt,
    session: PredictVenueSession,
  ): Promise<FundingReceipt>;

  createSubscription(
    request: SubscriptionRequest,
    session: PredictVenueSession,
  ): Unsubscribe;
}
```

The session-bound view product services hold is the `PredictClient` type alias declared earlier in this document (Section 1). It is mechanically derived from `VenueAdapter` by stripping the trailing `session` parameter from every method, so the two cannot drift.

### Why this contract is broad

`VenueAdapter` spans the venue boundary for three reasons:

1. services need one place to get venue capabilities
2. the rest of the system should not depend on venue SDKs or adapter internals
3. adding a venue should not force new abstractions into higher layers

Methods are non-optional because optional methods push venue branching into services and hooks. Callers (i.e., product services holding a `PredictClient`) read `client.capabilities` before invoking a capability-specific method. If an unsupported method is called anyway, the adapter throws `PredictErrorCode.UNSUPPORTED_VENUE_CAPABILITY`; `PredictErrorCode.VENUE_UNAVAILABLE` is reserved for venue outages or unreachable venue APIs. Crypto up/down auxiliary price methods are part of the same contract because they are venue data dependencies, not UI helpers.

### Future split — escalation triggers (do NOT split now)

The current single-contract design is a deliberate choice: the width buys a stable boundary ("one contract per venue") and avoids pushing capability dispatch up into `PredictSessionService` or a new aggregator. **Do not split `VenueAdapter` into sub-contracts (e.g. `EventAdapter`, `TradingAdapter`, `PortfolioAdapter`) until at least one of the following triggers has fired.** This subsection exists so future architecture reviews don't re-litigate from scratch.

Escalation triggers — split when ANY is true:

1. **Capability router creep**: `PredictSessionService.getClient()` (or a new aggregator) starts branching on which sub-domain of methods is being invoked, effectively dispatching to N partial adapters.
2. **Cross-service churn from venue additions**: adding the second venue (Kalshi) forces unrelated services to update because the unified contract was extended for a different concern.
3. **Surface size**: the `VenueAdapter` contract crosses roughly 50 methods, at which point the width stops being a stable boundary and starts being a god interface.

Until then, the wide canonical contract earns its depth. If a split happens, services should naturally cluster by capability: market-data methods → `EventAdapter`, order methods → `TradingAdapter`, position/activity/balance methods → `PortfolioAdapter`, funding plan methods → `FundingAdapter`, subscriptions → `LiveAdapter`. The split should be a structural refactor, not a re-litigation of whether one canonical entity model is worth having.

Canonical financial values are base-10 decimal strings, not JavaScript numbers and not raw token integers. A settlement-currency amount is expressed in the active venue's settlement currency with precision no greater than `PredictVenueInfo.settlementCurrency.decimals`; it has no currency symbol, commas, or scientific notation. The active adapter converts to and from raw venue/token units when creating orders or funding plans.

`fetchBalance()` intentionally returns only a settlement-currency decimal string. Currency metadata such as symbol, decimals, token address, and chain lives in `PredictVenueInfo`. This keeps balance reads stable and prevents token-level implementation details from leaking into portfolio UI.

The contract is intentionally shallow per method. It describes venue capabilities and venue-produced plans, not product workflows. `getOrderPreview()` is a venue quote/read operation. `submitOrder()` is raw venue submission, but `depositThenSubmitOrder()` does not exist. That workflow belongs in `TradingService`, not in the adapter.

Funding plan creators follow the same rule. `createDepositPlan()`, `createWithdrawPlan()`, and `createClaimPlan()` may perform venue-specific payload signing or venue API preflight required to produce a valid plan, but they do not submit wallet transactions, track confirmations, manage pending transaction state, or handle transaction-controller lifecycle hooks. Those workflows belong in `TransactionService` and the shared funding executor.

Deposit and withdraw plan creators support two explicit modes during migration. `editable-template` preserves legacy `prepareDeposit()` / `prepareWithdraw()` behavior by returning a wallet-transfer plan with a zero-amount template that confirmation / Transaction Pay can edit later. `fixed-amount` returns a final amount-specific Funding Plan. This plan can be an EVM transaction, a Solana transfer with venue follow-up, or a venue API operation depending on the active Venue.

## 4. PolymarketAdapter Implementation

The initial active adapter is `PolymarketAdapter`, a stateless implementation of `VenueAdapter`. Product services never see Polymarket-specific DTOs or transports; they hold a `PredictClient` (the session-bound view) and call canonical methods.

### Venue surfaces used

Polymarket requires multiple underlying APIs and transports:

- Gamma API for event and market discovery
- CLOB API for price history, orderbook, previewing, and order submission
- Polymarket crypto price endpoints for crypto up/down price history and reference prices
- Polymarket data/account endpoints for balances, positions, activity, and PnL
- WebSocket feeds for live price, orderbook, sports game, and crypto price updates
- on-chain helpers for balances and venue transaction construction

```text
   [ Product Service ]
            │ holds PredictClient (session-bound view)
            ▼
   ┌─────────────────────────┐
   │ PredictSessionService   │
   │ (binds session into a   │
   │  proxy of VenueAdapter) │
   └────────────┬────────────┘
                ▼
   ┌─────────────────────────┐
   │  PolymarketAdapter      │
   │  implements VenueAdapter │
   │  (stateless)            │
   └────────────┬────────────┘
       /        |        \         \
      v         v         v         v
 Gamma API   CLOB API   Data/Acct   WebSockets
 (Events)    (Orders)   Endpoints   (Live)
```

`PolymarketAdapter` unifies those sources into the Predict domain model. `PredictSessionService` binds the active session into a `PredictClient`-typed proxy of the adapter and hands it to the service.

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

### Authentication, signing, and venue account responsibility

Authentication details, per-account signing, eligibility, readiness, and venue account resolution stay behind the `PredictSessionService` + `PredictClient` seam. `PredictSessionService` returns a client bound to one active `venueId` and `ownerAddress`; product services call that client and never pass session objects through the product layer.

Examples of internal session material:

- CLOB API keys and L2 header inputs
- CLOB order signing context
- account-specific headers or session configuration
- Polymarket Safe/deposit-wallet address context while legacy accounts still exist
- venue activity hints required to choose the right venue account while legacy accounts still exist
- venue-specific auth/setup context such as Kalshi login or KYC status

Product services ask `PredictSessionService.getClient(ownerAddress)` before calling a venue. They do not pass legacy `Signer` objects, signing callbacks, CLOB credentials, venue-account addresses, wallet types, deployment flags, or session objects through public service methods. The session service owns signer resolution, session caching, refresh, invalidation, eligibility, and account-readiness state; the client owns canonical delegation; the adapter owns only stateless venue protocol construction.

There is intentionally no public session-purpose enum. A venue session represents whatever authenticated context that venue needs for the current MetaMask account. If a future venue needs multiple internal credentials, that detail stays inside `PredictSessionService` and adapter-created session data, not in product service APIs.

Services can request client capabilities like `submitOrder()` or `createClaimPlan()` without knowing how Polymarket authenticates those calls, signs CLOB orders, signs venue-specific funding payloads, or resolves the user's venue account. `fetchAccountReadiness()` is part of the `VenueAdapter` contract but is invoked **only by `PredictSessionService`**, which stores the result in its `readinessByOwner` state slice; product services and views read readiness from that slice via Redux selectors, never by calling the venue method directly. `fetchAccountReadiness()` returns product-level venue/account readiness (`canTrade`, status, blockers), not venue account internals, feature flags, or app-wide network guard state. `canTrade` is derived from `status === 'ready'`.

### Stateful workflow exclusions

Several current `PolymarketProvider` responsibilities must not be blindly moved into the adapter:

| Current responsibility in `PolymarketProvider`                         | Target owner                                                                                                                                                                                 |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| order rate limiting                                                    | `TradingService`                                                                                                                                                                             |
| active-order state machine                                             | `TradingService` / controller session state                                                                                                                                                  |
| optimistic position overlays                                           | `TradingService` calls `PortfolioReadModelWriter.onOrderSubmitted/Confirmed/Failed` directly; `PortfolioService` owns the writer implementation, cache patches, reconciliation, and rollback |
| deposit-before-order chaining                                          | `TradingService` (via private funding-executor seam), backed by `TransactionService` internals                                                                                               |
| transaction status side effects                                        | `TransactionService` / controller integration                                                                                                                                                |
| auth/session caches, eligibility, readiness, and venue account context | `PredictSessionService`; temporary Polymarket migration helpers only where legacy shape must be preserved                                                                                    |
| analytics                                                              | `predictAnalytics` helper (injected module — not a first-class service)                                                                                                                      |
| retries and cache fallback                                             | BaseDataService-backed services                                                                                                                                                              |

Phase 2 may temporarily leave these responsibilities in the legacy `PolymarketProvider` while it delegates lower-level reads and venue requests to the new client. They move to services in Phases 3 and 4.

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
    volume: toDecimalString(market.volumeNum ?? 0),
    liquidity: toDecimalString(market.liquidity ?? 0),
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
      price: toDecimalString(token.price),
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
    liquidity: toDecimalString(dto.liquidity ?? 0),
    volume: toDecimalString(dto.volume ?? 0),
    endsAt: dto.endDate,
    game: mapGame(dto),
    series: mapSeries(dto.series),
    parentEventId: dto.parentEventId,
  };
}
```

The specific mapping details will evolve, but the architectural rule does not: transformation belongs here, not in services or hooks.

## 5. Future KalshiAdapter

`KalshiAdapter` is the expected next implementation of `VenueAdapter`. The existing contract is designed to support it without changing higher layers — and because `PredictClient` is derived from `VenueAdapter`, the product-facing handle stays consistent across venues by construction.

### Same contract, different transport and semantics

Kalshi is likely to differ from Polymarket in several important ways:

- account setup and KYC readiness instead of Polymarket wallet setup
- an ISV sub-account model where balances and positions are scoped by Kalshi auth
- Solana USDC deposits using one-time amount-specific deposit addresses plus a deposit indication postback
- API-driven withdrawals to crypto wallets rather than a user-signed EVM withdrawal transaction
- direct trading rather than a proxy wallet flow
- different order types and preview semantics
- different account and position models
- WebSocket, SSE, or another streaming mechanism instead of the same Polymarket socket contract

Those differences should remain inside `KalshiAdapter` and the session state managed with `PredictSessionService`.

### How the interface accommodates venue differences

The contract is intentionally phrased in product capabilities, not venue implementation details.

Examples:

- client `submitOrder()` does not require callers to know how the venue executes the order
- client `createDepositPlan()` can return a Polymarket wallet-transfer plan or a Kalshi Solana USDC transfer plan with a required deposit-indication follow-up
- client `createWithdrawPlan()` can return a wallet-transfer plan or a Kalshi venue-API withdrawal plan
- client `createClaimPlan()` can return `UNSUPPORTED_VENUE_CAPABILITY` for venues such as Kalshi where settlement is automatic and there is no manual Claim
- client `createSubscription()` abstracts whether the venue uses WebSocket, SSE, or another push channel
- client `fetchAccountReadiness()` normalizes venue-specific setup conditions such as Polymarket account readiness or Kalshi KYC into product-level `PredictAccountReadiness`

This means the service layer can remain stable even when venues differ substantially.

### Venue-specific freedom inside the seam

The adapter interface does not force identical internal implementations. A Kalshi adapter may:

- omit proxy-wallet mechanics internally
- keep Kalshi participant IDs, sub-account numbers, API-key claims, and KYC/linking state inside session data
- translate amount cents, fixed-point dollars, and contract counts into canonical decimal strings
- translate venue-specific order states into the canonical order result shape
- use different auth or signing models
- compose multiple APIs differently than Polymarket does

The only requirement is that callers continue to receive canonical Predict entities and capability-level methods.

## 6. Adding a New Venue

Adding a venue should be a bounded infrastructure change, not a feature-wide rewrite.

### Step 1: implement `VenueAdapter`

Create a concrete adapter that implements `VenueAdapter`. Every returned value must be canonical Predict domain data, not venue DTOs. Do not declare any venue-specific client interface; `PredictClient` is a derived type that automatically applies to any `VenueAdapter` implementation.

### Step 2: add venue configuration

Define adapter-specific configuration such as:

- base URLs
- auth settings
- chain and token defaults
- supported live-data channels
- venue capability flags if needed for internal adapter decisions

### Step 3: register in the adapter registry used by PredictSessionService

Use a venue key to resolve the correct adapter implementation, and expose the currently active venue through a small registry/resolver owned below `PredictSessionService`. PredictNext may support multiple venue implementations over time, but only one venue is expected to be active for a user/session at a time.

```typescript
export type PredictVenueId = 'polymarket' | 'kalshi';

export interface VenueAdapterRegistry {
  get(venueId: PredictVenueId): VenueAdapter;
  getActive(): VenueAdapter;
  getActiveVenueId(): PredictVenueId;
}
```

The registry is the seam where environment, feature flags, account eligibility, or release configuration selects the active venue. Product services do not depend on this registry; they ask `PredictSessionService` for a client. They should not aggregate across all registered venues unless a future product requirement explicitly adds multi-active-venue support.

### Step 4: verify service compatibility

Run service integration tests against the `PredictClient` type (i.e., the canonical contract as seen by services). If service code needs venue-specific branching, that is a design smell. Prefer pushing that difference downward into the active adapter implementation.

### Step 5: add adapter integration tests

Test the new adapter at the venue seam:

- HTTP payload mapping
- account mapping
- order preview mapping
- Funding Plan construction, including wallet-transfer, venue-API, and follow-up cases
- live data subscription translation

### Acceptance rule for new venues

A new venue integration is architecturally successful when:

- hooks do not change
- components do not change
- controller shape does not change
- service public interfaces do not change
- only adapter implementation and venue configuration need significant work

That is the payoff of keeping the client canonical, adapters hidden and stateless, services deep, and the public Predict model canonical.
