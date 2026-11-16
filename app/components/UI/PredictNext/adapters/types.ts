import type {
  FetchFeedParams,
  FetchPortfolioPageParams,
  FetchPositionsParams,
  FetchSearchParams,
  PredictActivityPage,
  PredictBalance,
  PredictEntityId,
  PredictEvent,
  PredictFeed,
  PredictFeedId,
  PredictMarketHistory,
  PredictMarketHistoryRange,
  PredictOrderApproval,
  PredictOrderReview,
  PredictOrderPreview,
  PredictOrderPreviewParams,
  PredictOrderReceipt,
  PredictPortfolioSummary,
  PredictPositionsPage,
  PredictReadOptions,
  PredictSearchResults,
  PredictVenueCatalog,
  PredictVenueStatus,
  PredictUnresolvedOrdersPage,
} from '../types';

export interface VenuePortfolioAdapter {
  fetchBalance(options?: PredictReadOptions): Promise<PredictBalance>;
  fetchPositions(
    params: FetchPositionsParams,
    options?: PredictReadOptions,
  ): Promise<PredictPositionsPage>;
  /** Totals over every holding: the backend's holdings totals plus the
   * Balance. */
  fetchPortfolioSummary(
    options?: PredictReadOptions,
  ): Promise<PredictPortfolioSummary>;
  fetchActivity(
    params: FetchPortfolioPageParams,
    options?: PredictReadOptions,
  ): Promise<PredictActivityPage>;
}

/** Trading is a write-adjacent capability: requests are never cached and
 * never blindly retried. Committing an approved Order Preview is the only
 * placement path and is signed once; the backend is idempotent by Preview
 * reference. Observing reads the operation's receipt and never submits. */
export interface VenueTradingAdapter {
  previewOrder(
    params: PredictOrderPreviewParams,
    options?: PredictReadOptions,
  ): Promise<PredictOrderPreview>;
  /** Checks the pinned Preview and returns its user-facing signing bounds. */
  reviewOrder(previewId: string): Promise<PredictOrderReview>;
  /** Revokes all locally pinned quotes without affecting observe-only recovery. */
  invalidatePreviews(): void;
  /** Commits only the adapter's pinned quote after explicit user approval.
   * The adapter owns venue conversion; product callers supply no signed data. */
  commitOrder(
    previewId: string,
    approval: PredictOrderApproval,
    options?: PredictReadOptions,
  ): Promise<PredictOrderReceipt>;
  /** The operation's canonical Order Receipt. Never submits; while the
   * backend reconciles an ambiguous submission it device-signs the venue
   * order scan. A missing row does not resolve an earlier dispatch. */
  observeOrder(
    previewId: string,
    options?: PredictReadOptions,
  ): Promise<PredictOrderReceipt>;
  /** Owner-scoped bearer-only discovery; never signs or submits a mutation. */
  listUnresolvedOrders(
    params: FetchPortfolioPageParams,
    options?: PredictReadOptions,
  ): Promise<PredictUnresolvedOrdersPage>;
}

export interface VenueMarketDataAdapter {
  fetchVenueStatus(options?: PredictReadOptions): Promise<PredictVenueStatus>;
  /** The Venue's product support: actions, discovery Feeds by key, and
   * search. Parsed with `parsePredictVenueCatalog`, so it fails closed. */
  fetchVenueCatalog(options?: PredictReadOptions): Promise<PredictVenueCatalog>;
  fetchFeed(
    feedId: PredictFeedId,
    params: FetchFeedParams,
    options?: PredictReadOptions,
  ): Promise<PredictFeed>;
  fetchEvent(
    eventId: PredictEntityId,
    options?: PredictReadOptions,
  ): Promise<PredictEvent>;
  fetchMarketHistory(
    marketId: PredictEntityId,
    range: PredictMarketHistoryRange,
    options?: PredictReadOptions,
  ): Promise<PredictMarketHistory>;
  searchEvents(
    params: FetchSearchParams,
    options?: PredictReadOptions,
  ): Promise<PredictSearchResults>;
}
