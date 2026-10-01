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
export type PredictHttpsUrl = string & { readonly __brand: 'PredictHttpsUrl' };
export type PredictHexColor = string & { readonly __brand: 'PredictHexColor' };

export const KALSHI_VENUE_ID = 'kalshi' as PredictVenueId;

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

/**
 * Catalog-derived presentation data for an account-scoped entry. Present only
 * when the entry's venue market exists in the canonical catalog; a missing
 * match omits the context and the entry is never enriched from tickers or
 * labels.
 */
export interface PredictEntryContext {
  eventId: PredictEntityId;
  eventTitle: string;
  eventImageUrl?: PredictHttpsUrl;
  marketQuestion: string;
  outcomeId?: PredictEntityId;
  outcomeLabel?: string;
}

export interface PredictPosition {
  venueId: PredictVenueId;
  marketId: PredictEntityId;
  side: PredictOutcomeSide;
  shares: PredictAmount;
  marketExposure?: PredictAmount;
  realizedPnl?: PredictSignedAmount;
  feesPaid?: PredictAmount;
  totalTraded?: PredictAmount;
  updatedAt?: PredictTimestamp;
  context?: PredictEntryContext;
}

export interface PredictFill {
  id: PredictEntityId;
  venueId: PredictVenueId;
  marketId: PredictEntityId;
  /**
   * Kalshi's canonical fill direction field: documented as the exposure the
   * fill created (buy-yes ≡ sell-no → 'yes'), while the demo API currently
   * echoes the transacted side. The contract deliberately carries no
   * buy/sell direction — the legacy action/side fields are deprecated — and
   * outcomeSide plus the matching leg's price are correct under either
   * semantics.
   */
  outcomeSide: PredictOutcomeSide;
  shares: PredictAmount;
  price: PredictDecimal;
  fee?: PredictAmount;
  timestamp: PredictTimestamp;
  context?: PredictEntryContext;
}

export type PredictSettlementResult = 'yes' | 'no' | 'scalar';

export interface PredictSettlement {
  id: PredictEntityId;
  venueId: PredictVenueId;
  marketId: PredictEntityId;
  result: PredictSettlementResult;
  /**
   * The side the user held at settlement (the nonzero count), not the
   * winning side. Omitted for scalar results and fully flat positions.
   */
  side?: PredictOutcomeSide;
  shares?: PredictAmount;
  proceeds: PredictAmount;
  costBasis?: PredictAmount;
  fee?: PredictAmount;
  timestamp: PredictTimestamp;
  context?: PredictEntryContext;
}

export type PredictActivityEntry =
  | (PredictFill & { type: 'fill' })
  | (PredictSettlement & { type: 'settlement' });

export interface PredictPositionsPage {
  venueId: PredictVenueId;
  positions: PredictPosition[];
  nextCursor?: string;
}

export interface PredictActivityPage {
  venueId: PredictVenueId;
  activity: PredictActivityEntry[];
  nextCursor?: string;
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
