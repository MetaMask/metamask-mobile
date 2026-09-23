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

/** A canonical buy intent: the Outcome side of one Market plus the entered
 * maximum USD spend before fees. */
export interface PredictOrderPreviewParams {
  marketId: PredictEntityId;
  side: PredictOutcomeSide;
  amount: PredictAmount;
}

/** Wire-shape twin of PredictOrderPreviewParams for the API transport. */
export interface FetchOrderPreviewParams {
  marketId: string;
  side: PredictOutcomeSide;
  amount: string;
}

/** Structured fee component source, keyed by the client into localized
 * labels; the server never sends display strings. */
export type PredictOrderPreviewFeeSource = 'venue' | 'metamask';

export interface PredictOrderPreviewFeeComponent {
  source: PredictOrderPreviewFeeSource;
  amount: PredictAmount;
}

/** A server-authoritative Order Preview. All monetary values are quoted by
 * the backend; the client never calculates them. */
export interface PredictOrderPreview {
  /** Opaque expiring token binding the quote to the authenticated intent. */
  previewId: string;
  venueId: PredictVenueId;
  marketId: PredictEntityId;
  side: PredictOutcomeSide;
  /** The entered maximum USD spend before fees. */
  requestedAmount: PredictAmount;
  /** Estimated cost of the quoted contracts; never above requestedAmount. */
  orderAmount: PredictAmount;
  estimatedContracts: number;
  averagePrice: PredictDecimal;
  fee: PredictAmount;
  /** Backend-owned breakdown of the fee; present when the backend reports it. */
  feeBreakdown: readonly PredictOrderPreviewFeeComponent[];
  /** The Order amount plus the fee: the total expected debit. */
  totalDebit: PredictAmount;
  potentialPayout: PredictAmount;
  potentialProfit: PredictSignedAmount;
  expiresAt: PredictTimestamp;
}

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
