import { PREDICT_MARKET_TYPES } from '../constants';

export type PredictVenueId = string & { readonly __brand: 'PredictVenueId' };
export type PredictEntityId = string & { readonly __brand: 'PredictEntityId' };
export type PredictFeedId = string & { readonly __brand: 'PredictFeedId' };
export type PredictTimestamp = string & {
  readonly __brand: 'PredictTimestamp';
};
/** Decimal string in [0, 1], used for prices and probabilities. */
export type PredictDecimal = string & { readonly __brand: 'PredictDecimal' };
/** Non-negative decimal string with no upper bound, used for money amounts. */
export type PredictAmount = string & { readonly __brand: 'PredictAmount' };
/** Signed decimal string with an optional leading '-', used for PnL. */
export type PredictSignedAmount = string & {
  readonly __brand: 'PredictSignedAmount';
};
/** Signed decimal string in percent units: "-12.5" means -12.5%. */
export type PredictSignedPercent = string & {
  readonly __brand: 'PredictSignedPercent';
};
export type PredictHttpsUrl = string & { readonly __brand: 'PredictHttpsUrl' };
export type PredictHexColor = string & { readonly __brand: 'PredictHexColor' };

export type PredictMarketStatus =
  | 'initialized'
  | 'active'
  | 'inactive'
  | 'closed'
  | 'determined'
  | 'disputed'
  | 'amended'
  | 'finalized';

export type PredictOutcomeSide = 'yes' | 'no';
export type PredictGameSelection = 'home' | 'away' | 'draw';
export type PredictMarketType =
  | (typeof PREDICT_MARKET_TYPES)[keyof typeof PREDICT_MARKET_TYPES]
  | (string & {});
export type PredictMarketGroupType = 'marketSelector' | (string & {});

export interface PredictMarketOption {
  type: 'number';
  value: number;
}

export interface PredictMarketGroup {
  key: string;
  groupType: PredictMarketGroupType;
  marketType?: PredictMarketType;
  option?: PredictMarketOption;
  displayOrder?: number;
}

export interface PredictSport {
  id: PredictEntityId;
  label: string;
}

export interface PredictCompetition {
  id: PredictEntityId;
  label: string;
}

export interface PredictTeam {
  name: string;
  abbreviation?: string;
  logoUrl?: PredictHttpsUrl;
  primaryColor?: PredictHexColor;
}

export type PredictGameStatus =
  | 'scheduled'
  | 'in_progress'
  | 'delayed'
  | 'suspended'
  | 'postponed'
  | 'completed'
  | 'canceled';

export interface PredictGame {
  status: PredictGameStatus;
  homeTeam: PredictTeam;
  awayTeam: PredictTeam;
  score?: {
    home: string;
    away: string;
  };
  period?: string;
  clock?: string;
  observedAt: PredictTimestamp;
}

export interface PredictSportsContext {
  sport: PredictSport;
  competition?: PredictCompetition;
  game?: PredictGame;
}

export type PredictMarketHistoryRange =
  | 'LIVE'
  | '1D'
  | '1W'
  | '1M'
  | '1Y'
  | 'ALL';

export interface PredictMarketHistoryPoint {
  timestamp: PredictTimestamp;
  yesPrice: PredictDecimal;
  noPrice: PredictDecimal;
}

export interface PredictMarketHistory {
  venueId: PredictVenueId;
  marketId: PredictEntityId;
  range: PredictMarketHistoryRange;
  observedAt: PredictTimestamp;
  points: readonly PredictMarketHistoryPoint[];
}

export interface PredictOutcome {
  id: PredictEntityId;
  side: PredictOutcomeSide;
  label: string;
  askPrice?: PredictDecimal;
  bidPrice?: PredictDecimal;
  gameSelection?: PredictGameSelection;
}

export interface PredictMarket {
  id: PredictEntityId;
  question: string;
  rules?: string;
  outcomes: readonly [PredictOutcome, PredictOutcome];
  status: PredictMarketStatus;
  group?: PredictMarketGroup;
  /**
   * Last traded price, yes-side, as of `updatedAt`. Absent when the Market has
   * never traded. Streamed only; the REST read model does not carry it.
   */
  lastPrice?: PredictDecimal;
  /** Contracts traded, not settlement currency. Same unit from REST and stream. */
  volume?: string;
  volume24h?: string;
  createdAt?: PredictTimestamp;
  /**
   * Two sources, two meanings. From REST it is the Venue's market-metadata
   * update time and says nothing about when prices moved. Once a streamed
   * quote has patched this Market it is that quote's observation time, i.e.
   * when `lastPrice` and the outcome prices were last observed.
   */
  updatedAt?: PredictTimestamp;
  opensAt?: PredictTimestamp;
  closesAt?: PredictTimestamp;
  resolvesAt?: PredictTimestamp;
}

export interface PredictSettlementSource {
  name: string;
  url: PredictHttpsUrl;
}

export interface PredictEvent {
  venueId: PredictVenueId;
  id: PredictEntityId;
  title: string;
  subtitle?: string;
  rules?: string;
  startsAt?: PredictTimestamp;
  closesAt?: PredictTimestamp;
  updatedAt?: PredictTimestamp;
  description?: string;
  category?: string;
  volume?: string;
  volume24h?: string;
  imageUrl?: string;
  sports?: PredictSportsContext;
  settlementSources?: readonly PredictSettlementSource[];
  markets: readonly PredictMarket[];
}

export interface FetchFeedParams {
  cursor?: string;
  limit?: number;
}

export interface PredictFeed {
  venueId: PredictVenueId;
  id: PredictFeedId;
  title: string;
  events: readonly PredictEvent[];
  nextCursor?: string;
}

// A type alias so the params satisfy Json as part of a query key.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FetchSearchParams = {
  /** Free text; every whitespace-separated term must match. */
  q: string;
  limit?: number;
};

/** Ranked, unpaginated Events matching a text query. */
export interface PredictSearchResults {
  venueId: PredictVenueId;
  events: readonly PredictEvent[];
}

export interface PredictVenueStatus {
  venueId: PredictVenueId;
  status: 'available' | 'degraded' | 'unavailable';
  checkedAt: PredictTimestamp;
  /** Backend-owned link for the platform-terms affordance. Absent when the
   * Venue has no agreement to link, in which case no link is rendered. */
  termsUrl?: string;
}

/** A product action a Venue supports. Support is not rollout, Venue Status,
 * eligibility, or Account Readiness; the backend still authorizes every write. */
export const PREDICT_VENUE_ACTIONS = [
  'buy',
  'sell',
  'claim',
  'deposit',
  'withdraw',
] as const;
export type PredictVenueAction = (typeof PREDICT_VENUE_ACTIONS)[number];

/**
 * Stable, kebab-case product keys for discovery Feeds. A surface section or
 * tab names a key, never a concrete Feed ID; each Venue's catalog maps the
 * keys it supports to its own Feed IDs. Keys outside this list are dropped
 * when a catalog is parsed.
 */
export const PREDICT_FEED_KEYS = [
  'trending',
  'live',
  'sports',
  'crypto',
  'politics',
  'crypto-up-down-live',
  'world-cup',
  'nfl-games',
  'nfl-props',
  'college-football-games',
  'college-football-props',
] as const;
export type PredictFeedKey = (typeof PREDICT_FEED_KEYS)[number];

/** The support part of a Venue descriptor: the wire shape of the Venue
 * catalog (`GET /v1/venues/{venueId}/catalog`). */
export interface PredictVenueCatalog {
  venueId: PredictVenueId;
  actions: readonly PredictVenueAction[];
  feeds: Readonly<Partial<Record<PredictFeedKey, PredictFeedId>>>;
  searchSupported: boolean;
}

export interface PredictBalance {
  venueId: PredictVenueId;
  currency: 'USD';
  available: PredictAmount;
}

/** A canonical Order intent, discriminated by the Order Action (ADR-0001):
 * a buy spends USD on an Outcome; a sell (Cash Out) offers whole contracts
 * of a held Position. Every Order has exactly one Action. */
export type PredictOrderPreviewParams =
  | {
      marketId: PredictEntityId;
      side: PredictOutcomeSide;
      action: 'buy';
      /** The entered maximum USD spend before fees. */
      amount: PredictAmount;
    }
  | {
      marketId: PredictEntityId;
      side: PredictOutcomeSide;
      action: 'sell';
      /** Whole contracts to sell, as a positive-integer decimal string:
       * a Position is share-denominated and the Venue matches whole
       * contracts only. */
      contracts: PredictAmount;
    };

/** Wire-shape twin of PredictOrderPreviewParams for the API transport.
 * Version tolerance (ADR-0001): a buy keeps the exact PRED-1194 body — a
 * strict deployed schema rejects unknown keys, so it carries no `action` —
 * while a sell carries the `action: 'sell'` discriminator it needs. The
 * adapter maps the canonical union to this shape. */
export type FetchOrderPreviewParams =
  | {
      marketId: string;
      side: PredictOutcomeSide;
      amount: string;
    }
  | {
      marketId: string;
      side: PredictOutcomeSide;
      action: 'sell';
      /** Positive-integer decimal string: whole contracts only. */
      contracts: string;
    };

/** Structured fee component source, keyed by the client into localized
 * labels; the server never sends display strings. */
export type PredictOrderPreviewFeeSource = 'venue' | 'metamask';

export interface PredictOrderPreviewFeeComponent {
  source: PredictOrderPreviewFeeSource;
  amount: PredictAmount;
}

/** Shared header of a server-authoritative Order Preview. All monetary
 * values are quoted by the backend; the client never calculates them. */
interface PredictOrderPreviewBase {
  /** Opaque expiring token binding the quote to the authenticated intent. */
  previewId: string;
  venueId: PredictVenueId;
  marketId: PredictEntityId;
  side: PredictOutcomeSide;
  estimatedContracts: number;
  averagePrice: PredictDecimal;
  fee: PredictAmount;
  /** Backend-owned breakdown of the fee; present when the backend reports it. */
  feeBreakdown: readonly PredictOrderPreviewFeeComponent[];
  expiresAt: PredictTimestamp;
}

/** A buy Order Preview: estimated cost, fees, and potential return. */
export interface PredictBuyOrderPreview extends PredictOrderPreviewBase {
  action: 'buy';
  /** The entered maximum USD spend before fees. */
  requestedAmount: PredictAmount;
  /** Estimated cost of the quoted contracts; never above requestedAmount. */
  orderAmount: PredictAmount;
  /** The Order amount plus the fee: the total expected debit. */
  totalDebit: PredictAmount;
  potentialPayout: PredictAmount;
  potentialProfit: PredictSignedAmount;
}

/** A sell (Cash Out) Order Preview: contracts offered, estimated Proceeds,
 * and estimated Net Proceeds. Buy-only fields are absent, not null. */
export interface PredictSellOrderPreview extends PredictOrderPreviewBase {
  action: 'sell';
  /** The requested whole-contract count. */
  requestedContracts: number;
  /** The worst Bid the sale would consume: the Immediate Order price floor.
   * Shared wire field — buy Previews report the worst ask, which the mobile
   * buy schema masks rather than rejects. */
  limitPrice: PredictDecimal;
  /** Gross Proceeds the quoted contracts sell for, before fees. */
  estimatedProceeds: PredictAmount;
  /** Proceeds minus the fee: the amount credited to the Venue Account. */
  estimatedNetProceeds: PredictAmount;
}

/** A server-authoritative Order Preview, discriminated by the Order Action.
 * Cross-action fields fail validation at the parse boundary. */
export type PredictOrderPreview =
  | PredictBuyOrderPreview
  | PredictSellOrderPreview;

/** Wire-shape body for committing an approved Order Preview. Strictly the
 * Preview reference only: the backend derives every executable detail from
 * the stored, expiring Order Preview, so the client can never alter Market,
 * Outcome, spend, quantity, price, or fee at commit time. */
export interface FetchOrderCommitParams {
  previewId: string;
}

/** Status of a committed Order operation, as projected by the backend onto
 * the canonical Order Receipt. `pending` and `submitted` are in-progress
 * projections: the backend has accepted the Commit and is still working, so
 * keep observing by committing the same Order Preview again — the Commit is
 * idempotent by `previewId`. `filled` is a complete fill of the quoted
 * contracts. `partially_filled` is a non-zero partial fill: a success
 * rendered with honest partial-fill copy. `not_filled` is the canonical
 * outcome for zero fills; nothing was spent and no Position changed.
 * `rejected` means the Venue refused the Order; nothing was filled.
 * `reconciliation_required` means the backend is still resolving the true
 * outcome; render it like an in-progress status and re-observe by committing
 * the same Order Preview again. */
export type PredictOrderReceiptStatus =
  | 'pending'
  | 'submitted'
  | 'filled'
  | 'partially_filled'
  | 'not_filled'
  | 'rejected'
  | 'reconciliation_required';

/** Shared header of a committed Order's canonical result. One Order
 * produces exactly one Order Receipt, and repeated Commits of the same
 * `previewId` converge on it. Nullable fill fields are null until the
 * Venue reports them. */
interface PredictOrderReceiptBase {
  /** Durable backend operation identity; stable across repeated Commits. */
  operationId: string;
  /** The committed Order Preview; the idempotency key for re-observation. */
  previewId: string;
  venueId: PredictVenueId;
  marketId: PredictEntityId;
  side: PredictOutcomeSide;
  status: PredictOrderReceiptStatus;
  /** Contracts the committed Order Preview quoted; never zero. */
  quotedContracts: number;
  /** Venue order identifier once the Venue has produced one. */
  venueOrderId: string | null;
  /** Average fill price in [0, 1]; null until the Venue reports fills. */
  averageFillPrice: PredictDecimal | null;
  /** Fees charged for the fills; null until the Venue reports fills. */
  fee: PredictAmount | null;
}

/** A buy Order Receipt: what was spent and what exposure it opened. */
export interface PredictBuyOrderReceipt extends PredictOrderReceiptBase {
  action: 'buy';
  /** Quoted maximum USD spend before fees, from the committed Order Preview. */
  requestedMaxSpend: PredictAmount;
  /** Contracts actually filled; null until the Venue reports fills. */
  filledContracts: PredictAmount | null;
  /** Total debit actually incurred; null until the Venue reports fills. */
  actualSpend: PredictAmount | null;
  /** Settlement value of the filled contracts; null for zero fills. */
  payoutExposure: PredictAmount | null;
}

/** A sell (Cash Out) Order Receipt: what was sold and what it credited.
 * Buy-only fields are absent, not null. Fill fields are projected as
 * fixed-point decimal strings, identical across actions. */
export interface PredictSellOrderReceipt extends PredictOrderReceiptBase {
  action: 'sell';
  /** Contracts actually filled; null until the Venue reports fills. */
  filledContracts: PredictAmount | null;
  /** Gross Proceeds of the fills; null for zero fills. */
  actualProceeds: PredictAmount | null;
  /** Proceeds of the fills minus the fee; null for zero fills. */
  netProceeds: PredictAmount | null;
}

/** The canonical result of a committed Order, discriminated by the Order
 * Action. Cross-action fields fail validation at the parse boundary. */
export type PredictOrderReceipt =
  | PredictBuyOrderReceipt
  | PredictSellOrderReceipt;

export interface FetchPortfolioPageParams {
  cursor?: string;
  limit?: number;
}

/** `opened` pages by status group, then newest holding first. `value` is
 * the unpaginated top `limit` Positions by current value. */
export type PredictPositionsSort = 'opened' | 'value';

export interface FetchPositionsParams extends FetchPortfolioPageParams {
  /** Subset of statuses to read; all statuses when absent. */
  status?: PredictPositionStatus[];
  sort?: PredictPositionsSort;
}

/**
 * Catalog-derived presentation data for an account-scoped entry. Present only
 * when the entry's Market exists in the canonical catalog; a missing match
 * omits the context and the entry is never enriched from tickers or labels.
 */
export interface PredictEntryContext {
  eventId: PredictEntityId;
  eventTitle: string;
  marketQuestion: string;
  /** Label of the held, traded, or settled Outcome. */
  outcomeLabel: string;
  /** The most specific approved image: the Market's, else the Event's. */
  imageUrl?: PredictHttpsUrl;
}

/** `open` until the Market's result is determined. `claimable` needs a
 * Claim to pay out; `settled` needs no user action. Only advances. */
export type PredictPositionStatus = 'open' | 'claimable' | 'settled';

/**
 * One held Outcome, valued by the backend. Valuation fields are absent, never
 * zero, when the backend has no authoritative source for them.
 */
export interface PredictPosition {
  venueId: PredictVenueId;
  marketId: PredictEntityId;
  side: PredictOutcomeSide;
  status: PredictPositionStatus;
  /** Exact decimal shares, always greater than zero. */
  shares: PredictAmount;
  /** Fee-exclusive average execution price of the held shares. Absent when
   * the backend's Order ledger cannot account for the holding. */
  averagePrice?: PredictDecimal;
  /** USD paid for the held shares, entry fees included. Absent when the
   * backend's Order ledger cannot account for the holding. */
  costBasis?: PredictAmount;
  /** USD at a fresh best Bid (`open`) or the determined payout (resolved).
   * Absent without an authoritative price. */
  currentValue?: PredictAmount;
  /** `currentValue` − `costBasis`; present only with both. */
  unrealizedPnl?: PredictSignedAmount;
  /** `unrealizedPnl` / `costBasis` × 100; absent with no PnL or a zero cost
   * basis. */
  unrealizedPnlPercent?: PredictSignedPercent;
  context?: PredictEntryContext;
}

/**
 * Totals over every holding, computed by the backend, never from a loaded
 * Positions page. When `complete` is false the sums cover only the valued
 * holdings and are lower bounds.
 */
export interface PredictPortfolioSummary {
  venueId: PredictVenueId;
  currency: 'USD';
  /** The same value the Balance read returns. */
  availableBalance: PredictAmount;
  /** Σ `currentValue` of `open` and `settled` Positions that have one. */
  positionsValue: PredictAmount;
  /** Σ `currentValue` of `claimable` Positions; "0" without Claims. */
  claimableValue: PredictAmount;
  /** `availableBalance` + `positionsValue` + `claimableValue`, exactly. */
  totalValue: PredictAmount;
  /** Over `open` Positions with a current value; "0" when there are none. */
  unrealizedPnl: PredictSignedAmount;
  /** Absent when the cost basis of those Positions sums to zero. */
  unrealizedPnlPercent?: PredictSignedPercent;
  asOf: PredictTimestamp;
  /** True only when every holding was traversed and valued. */
  complete: boolean;
}

interface PredictActivityEntryBase {
  venueId: PredictVenueId;
  /** Opaque and stable; `(venueId, id)` is the entry's identity. */
  id: PredictEntityId;
  /** The traded or settled Outcome. */
  marketId: PredictEntityId;
  side: PredictOutcomeSide;
  /** Trade: filled shares. Settlement: shares net held at Settlement. */
  shares: PredictAmount;
  /** Trade: the Order's last Fill. Settlement: the Venue settlement time. */
  timestamp: PredictTimestamp;
  context?: PredictEntryContext;
}

/** The executed part of one Order: its Fills aggregated. The action comes
 * from the backend's own Order records, never from a Venue Fill. */
export interface PredictTradeEntry extends PredictActivityEntryBase {
  type: 'trade';
  action: 'buy' | 'sell';
  /** Fee-exclusive VWAP of the Order's Fills. */
  price: PredictDecimal;
  /** Balance movement: a buy's debit including the fee, a sell's credit net
   * of it. */
  amount: PredictAmount;
  fee: PredictAmount;
  /** Sells only: `amount` minus the cost basis of the sold shares. Absent on
   * buys, and when that cost basis cannot be established. */
  realizedPnl?: PredictSignedAmount;
}

export type PredictSettlementResult = 'yes' | 'no' | 'scalar';

/** One Market's Settlement, for the side the Predict User net held. */
export interface PredictSettlementEntry extends PredictActivityEntryBase {
  type: 'settlement';
  /** The Market's result, which is often not the held side. */
  result: PredictSettlementResult;
  /** USD credited by the Settlement; "0" for a losing Position. */
  proceeds: PredictAmount;
  /** `proceeds` minus the cost basis of the settled shares. Absent only when
   * that cost basis cannot be established. */
  realizedPnl?: PredictSignedAmount;
}

/** Ordered by `timestamp` descending, then `trade` before `settlement`, then
 * `id` ascending. */
export type PredictActivityEntry = PredictTradeEntry | PredictSettlementEntry;

export interface PredictPositionsPage {
  venueId: PredictVenueId;
  positions: PredictPosition[];
  nextCursor?: string;
}

export interface PredictActivityPage {
  venueId: PredictVenueId;
  activity: PredictActivityEntry[];
  nextCursor?: string;
  /** Present when the page reaches history the Venue has archived:
   * Settlements before this instant may be missing. Trades stay complete. */
  settlementsCompleteFrom?: PredictTimestamp;
}

export interface PredictReadOptions {
  signal?: AbortSignal;
}

export interface PredictQueryDescriptor<TKey extends readonly unknown[]> {
  queryKey: TKey;
  family: readonly unknown[];
  staleTime: number;
  scope: 'venue';
}
