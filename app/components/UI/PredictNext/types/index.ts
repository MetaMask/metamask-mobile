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
  /** The card's title when the client can't name it, such as a Player. */
  label?: string;
}

/** One level of a Market's Event screen placement. Keys are opaque IDs. */
export interface PredictMarketLayoutLevel {
  key: string;
  order: number;
}

/** Where a Market goes on the Event screen: tab › section › subgroup. */
export interface PredictMarketLayout {
  tab: PredictMarketLayoutLevel;
  section: PredictMarketLayoutLevel;
  subgroup?: PredictMarketLayoutLevel;
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
  /**
   * The direction the logo art points. Absent when the logo has no
   * direction; such a logo is never mirrored.
   */
  logoFacing?: PredictTeamLogoFacing;
}

export type PredictTeamLogoFacing = 'left' | 'right';

/** The order a Game's Teams are listed in. Absent means `away_first`. */
export type PredictGameTeamOrder = 'away_first' | 'home_first';

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
  teamOrder?: PredictGameTeamOrder;
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
  layout?: PredictMarketLayout;
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

/** Which venue deployment the catalog describes. Drives deposit chain and
 * transfer mode in every build. */
export const PREDICT_VENUE_ENVIRONMENTS = ['sandbox', 'production'] as const;
export type PredictVenueEnvironment =
  (typeof PREDICT_VENUE_ENVIRONMENTS)[number];

/**
 * Stable, kebab-case product key for a discovery Feed, for example
 * `nfl-games`. The Predict API owns the vocabulary (PRED-1522), so any
 * kebab-case key a catalog serves is accepted (PRED-1526). A surface section
 * or tab names a key, never a concrete Feed ID; each Venue's catalog maps the
 * keys it supports to its own Feed IDs.
 */
export type PredictFeedKey = string;

/** One tab of a Feed Screen: it shows the Feed its `feed` key names. */
export interface PredictVenueFeedScreenTab {
  /** Kebab-case, unique within its screen: deep links select a tab by it. */
  id: string;
  /** The server's label, shown when the app has no localized one. */
  title: string;
  /** A Feed key of the same catalog. */
  feed: PredictFeedKey;
}

/** A titled screen of tabs, each on one Feed (PRED-1525). */
export interface PredictVenueFeedScreen {
  /** Kebab-case and unique: deep links use it, and a Category opens the
   * screen whose `id` is its Feed key. */
  id: string;
  title: string;
  subtitle?: string;
  /** A design-system icon name, for example `TrendUp`, unchecked against
   * the app's icons. A Category's pill uses the icon of the screen it opens. */
  icon?: string;
  /** In display order; never empty. */
  tabs: readonly PredictVenueFeedScreenTab[];
}

/**
 * One PredictNext Home section (PRED-1527). `screen` names the Feed Screen
 * its header opens; the header opens nothing while the Venue's `screens` lack
 * it. Feed keys are keys of the same catalog's `feeds`. A `limit` is how
 * many Events the section shows, from 1 to 10; without it the app decides.
 */
export type PredictHomeSection =
  /** The Trending carousel, ranked from the Games of its source Feeds. */
  | {
      kind: 'trending';
      /** In read order; never empty. */
      sources: readonly PredictFeedKey[];
      /** The server's title; without it the app titles the carousel. */
      title?: string;
      limit?: number;
      screen?: string;
    }
  /** A row of the Games of one Feed. */
  | {
      kind: 'games-row';
      id: string;
      title: string;
      feed: PredictFeedKey;
      screen?: string;
    }
  /** The catalog's `categories`, as chips. */
  | { kind: 'categories' }
  /** A preview of one Feed's first Events. */
  | {
      kind: 'feed-preview';
      id: string;
      title: string;
      feed: PredictFeedKey;
      limit?: number;
      screen: string;
    };

/** PredictNext Home, as the Venue catalog lays it out. */
export interface PredictVenueHome {
  /** In display order; at most eight, reading at most eight Feeds. */
  sections: readonly PredictHomeSection[];
}

/** The support part of a Venue descriptor: the wire shape of the Venue
 * catalog (`GET /v1/venues/{venueId}/catalog`). */
export interface PredictVenueCatalog {
  venueId: PredictVenueId;
  /** Optional on legacy catalogs; required to enable deposits. */
  environment?: PredictVenueEnvironment;
  actions: readonly PredictVenueAction[];
  feeds: Readonly<Partial<Record<PredictFeedKey, PredictFeedId>>>;
  /** The Venue's Categories in display order, each named by its Feed key.
   * Every key is in `feeds`, and the Category opens on that Feed. */
  categories: readonly PredictFeedKey[];
  searchSupported: boolean;
  /** The Venue's Feed Screens. Empty when the catalog serves none. */
  screens: readonly PredictVenueFeedScreen[];
  /** PredictNext Home's sections. Undefined when the catalog serves no
   * usable `home`, and Home then shows no Feed sections. */
  home?: PredictVenueHome;
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
      /** Phone-generated id. The preview stores it as `client_order_id`. */
      idempotencyKey: string;
    }
  | {
      marketId: PredictEntityId;
      side: PredictOutcomeSide;
      action: 'sell';
      /** Whole contracts to sell, as a positive-integer decimal string:
       * a Position is share-denominated and the Venue matches whole
       * contracts only. */
      contracts: PredictAmount;
      /** Phone-generated id. The preview stores it as `client_order_id`. */
      idempotencyKey: string;
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
      idempotencyKey: string;
    }
  | {
      marketId: string;
      side: PredictOutcomeSide;
      action: 'sell';
      /** Positive-integer decimal string: whole contracts only. */
      contracts: string;
      idempotencyKey: string;
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
  /** The worst per-contract price the quote walked — the worst ask on a
   * buy, the worst bid on a sell. The commit signs its yes-leg form. */
  limitPrice: PredictDecimal;
  fee: PredictAmount;
  /** Backend-owned breakdown of the fee; present when the backend reports it. */
  feeBreakdown: readonly PredictOrderPreviewFeeComponent[];
  expiresAt: PredictTimestamp;
}

/** A buy Order Preview: estimated cost, fees, and potential return. */
export interface PredictBuyOrderPreview extends PredictOrderPreviewBase {
  action: 'buy';
  /** The entered maximum USD spend, fees included. */
  requestedAmount: PredictAmount;
  /** Estimated cost of the quoted contracts, before the fee. */
  orderAmount: PredictAmount;
  /** The Order amount plus the fee: the total expected debit. Never above
   * requestedAmount. */
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

/** Emitted only by the user's explicit approval of the displayed Preview. */
export interface PredictOrderApproval {
  readonly kind: 'user-approved';
}

/** Venue-neutral bounds checked by the phone for the exact quoted Order. */
export interface PredictOrderReview {
  readonly previewId: string;
  readonly maxCost: string;
  readonly contracts: string;
  readonly payout: string;
  /** Sell proceeds for the full count; partial or no fill can produce less. */
  readonly proceedsIfFullyFilled: string;
}

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
 * keep observing with the receipt GET, never another POST. `filled` is a
 * complete fill of the quoted
 * contracts. `partially_filled` is a non-zero partial fill: a success
 * rendered with honest partial-fill copy. `not_filled` is the canonical
 * outcome for zero fills; nothing was spent and no Position changed.
 * `rejected` means the Venue refused the Order; nothing was filled.
 * `reconciliation_required` means the backend is still resolving the true
 * outcome; render it like an in-progress status and re-observe with GET.
 * `needs_manual_review` means the order scan is too old to sign. The outcome
 * is unknown; retain its recovery reference without automatic scanning. */
export type PredictOrderReceiptStatus =
  | 'pending'
  | 'submitted'
  | 'filled'
  | 'partially_filled'
  | 'not_filled'
  | 'rejected'
  | 'reconciliation_required'
  | 'needs_manual_review';

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

/** Owner-scoped discovery of financially unresolved operations. */
export interface PredictUnresolvedOrder {
  previewId: string;
  receipt: PredictOrderReceipt;
  createdAt: PredictTimestamp;
  submittedAt: PredictTimestamp | null;
}

export interface PredictUnresolvedOrdersPage {
  operations: readonly PredictUnresolvedOrder[];
  nextCursor?: string;
}

/** How a Withdraw names its amount: one fixed USD figure, or the whole
 * withdrawable balance. */
export type PredictWithdrawMode = 'fixed' | 'sweep_all';

/** Networks a withdrawal can pay out on. */
export type PredictWithdrawNetwork = 'base';

/** Where the payout destination came from: the sandbox wallet this client
 * registered during demo setup, or a binding the Venue itself reported. A
 * destination is always read-only; the phone never supplies one. */
export type PredictWithdrawDestinationSource = 'configured_demo' | 'venue';

export interface PredictWithdrawDestination {
  address: string;
  network: PredictWithdrawNetwork;
  source: PredictWithdrawDestinationSource;
}

/** A Withdraw intent. Exactly one of a fixed USD amount or the whole balance;
 * the client sends no identity, destination, or idempotency key. */
export type PredictWithdrawPreviewParams =
  | { amount: PredictAmount }
  | { sweepAll: true };

/** A server-authoritative Withdraw Quote. The backend resolves the payout
 * destination and the expiry; the response carries no fee. A sweep omits
 * `requestedAmount` rather than nulling it. */
export interface PredictWithdrawPreview {
  /** Opaque expiring token binding the quote to the authenticated intent. */
  previewId: string;
  venueId: PredictVenueId;
  currency: 'USD';
  mode: PredictWithdrawMode;
  /** Present exactly on a `fixed` quote. */
  requestedAmount?: PredictAmount;
  destination: PredictWithdrawDestination;
  expiresAt: PredictTimestamp;
}

/** Status of a committed withdrawal, as projected by the backend. `pending`
 * and `processing` are in-progress: keep observing with the receipt GET,
 * never another POST. `settled` means the funds left; `failed` and `returned`
 * are terminal failures, and `returned` means the funds are back in the
 * account. `rejected` means the Venue refused the withdrawal and nothing was
 * sent. */
export type PredictWithdrawReceiptStatus =
  | 'pending'
  | 'processing'
  | 'settled'
  | 'failed'
  | 'returned'
  | 'rejected';

/** Why the Venue refused a `rejected` withdrawal. */
export type PredictWithdrawRejectionCode =
  | 'insufficient_balance'
  | 'amount_below_minimum'
  | 'step_up_verification_required'
  | 'venue_rejected';

/** The canonical result of a committed withdrawal. One Withdraw produces
 * exactly one receipt, and repeated Commits of the same `previewId` converge
 * on it. `needsManualReview` ends automatic observation: the outcome is
 * unknown and support resolves it. */
export interface PredictWithdrawReceipt {
  /** Durable backend operation identity; stable across repeated Commits. */
  operationId: string;
  /** The committed Withdraw Preview; the idempotency key for re-observation. */
  previewId: string;
  venueId: PredictVenueId;
  currency: 'USD';
  mode: PredictWithdrawMode;
  status: PredictWithdrawReceiptStatus;
  /** Present exactly on a `rejected` receipt, and always present there. */
  rejectionCode?: PredictWithdrawRejectionCode;
  needsManualReview: boolean;
  /** Present exactly on a `fixed` receipt. */
  requestedAmount?: PredictAmount;
  /** The amount the Venue reports as withdrawn; null until it reports one. */
  withdrawnAmount: PredictAmount | null;
  /** Venue transfer identifier once the Venue has produced one. */
  venueTransferId: string | null;
  destination: PredictWithdrawDestination;
  createdAt: PredictTimestamp;
  resolvedAt: PredictTimestamp | null;
}

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
  /**
   * Ordered, display-ready parts naming the Market beyond its Outcome, such
   * as `["Josh Jacobs", "60+"]` for a threshold line whose Outcome label is
   * only "Yes" or "No". Absent when the Outcome label names it alone.
   */
  marketLabels?: string[];
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
  /** Opaque continuation; it can be present even when activity is empty. */
  nextCursor?: string;
  /** Present when the page reaches history the Venue has archived:
   * Settlements before this instant may be missing. Trades stay complete. */
  settlementsCompleteFrom?: PredictTimestamp;
  /** Explicit demo-only Trades fallback. Production permission failures are
   * errors, not a successful page with silently missing Settlements. */
  settlementsDegradedReason?: 'venue_permission_denied';
}

/**
 * The statuses a deposit shows the app. Each covers one or more statuses the
 * backend stores (va-mmcx-predict-api `docs/FUNDING.md`). Only `failed` is
 * final. A `cancelled` deposit moves on when a transfer turns up after it, a
 * `completed` one goes to `under_review` when the credited transfer fails or
 * is returned, and support moves an `under_review` one to `completed` or
 * `failed`.
 */
export type PredictDepositStatus =
  | 'awaiting_transfer'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'under_review';

/** A `0x`-prefixed EVM address or transaction hash. */
export type PredictHex = `0x${string}`;

/**
 * The Funding Plan: send exactly `amount` of the token at `tokenContract` on
 * `chainId` to `depositAddress` before `planExpiresAt`. Typed fields only,
 * never transaction data. The venue cannot settle a different amount without
 * manual work.
 */
export interface PredictFundingPlan {
  chainId: number;
  tokenContract: PredictHex;
  /** USD, two decimals. The token is a USD stablecoin. */
  amount: PredictAmount;
  depositAddress: PredictHex;
  planExpiresAt: PredictTimestamp;
}

/**
 * The values the device signs for a new deposit. Never request bytes: the
 * phone renders the request from its signing profile.
 */
export interface PredictDepositSignRequest {
  kind: 'sign_request';
  amountCents: number;
  clientOperationId: string;
}

/**
 * What the app does next for a deposit. The set is closed: the app has one
 * fixed handler per kind and stops on a kind it does not know. There is no
 * generic "sign these bytes" or "send this transaction" step.
 */
export type PredictDepositNextStep =
  /** Only the unsigned create call answers it, before a deposit exists. */
  | PredictDepositSignRequest
  | ({ kind: 'wallet_transfer' } & PredictFundingPlan)
  /** The backend is working on it. Read the deposit again later. */
  | { kind: 'wait' }
  | { kind: 'done' }
  /** Support has to look at it. Show the reference and never retry. */
  | { kind: 'review'; supportReference: string };

/** A deposit's own next step: a deposit never asks to be signed. */
export type PredictDepositOperationStep = Exclude<
  PredictDepositNextStep,
  PredictDepositSignRequest
>;

/** One deposit operation, as the funding routes return it. */
export interface PredictDepositOperation {
  /** The backend's operation ID, not the venue's deposit ID. */
  operationId: PredictEntityId;
  status: PredictDepositStatus;
  /** The USD amount the user asked to deposit, two decimals. */
  amount: PredictAmount;
  chainId: number;
  tokenContract: PredictHex;
  /** Null until the venue returns an address. Several deposits can share
   * one address. */
  depositAddress: PredictHex | null;
  /** Null until the venue returns an address. The backend's deadline. */
  planExpiresAt: PredictTimestamp | null;
  /** Set once the transfer hash is reported. */
  txHash: PredictHex | null;
  createdAt: PredictTimestamp;
  /** Null once the deposit needs nothing more from the app: it failed or was
   * cancelled. */
  next: PredictDepositOperationStep | null;
}

/**
 * What starting a deposit answers: the values to sign, or the deposit the
 * same `clientOperationId` already created.
 */
export type PredictDepositStart =
  | { kind: 'sign_request'; signRequest: PredictDepositSignRequest }
  | { kind: 'deposit'; deposit: PredictDepositOperation };

/** Starts a deposit. `clientOperationId` is a UUID v4 the app makes once per
 * deposit; it is the idempotency key the device signs. */
export interface PredictDepositParams {
  /** USD, at least 1, at most two decimals. */
  amount: PredictAmount;
  clientOperationId: string;
}

/** The deposit's transfer, reported from the user's wallet. */
export interface PredictDepositTransferParams {
  txHash: PredictHex;
  chainId: number;
}

/** The explicit user approval that lets a deposit request be signed. */
export interface PredictDepositApproval {
  kind: 'user-approved';
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
