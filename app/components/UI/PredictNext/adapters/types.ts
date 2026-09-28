import type {
  FetchFeedParams,
  FetchPortfolioPageParams,
  PredictActivityPage,
  PredictBalance,
  PredictEntityId,
  PredictEvent,
  PredictFeed,
  PredictFeedId,
  PredictMarketHistory,
  PredictMarketHistoryRange,
  PredictOrderPreview,
  PredictOrderPreviewParams,
  PredictOrderReceipt,
  PredictPositionsPage,
  PredictReadOptions,
  PredictVenueStatus,
} from '../types';

export interface VenuePortfolioAdapter {
  fetchBalance(options?: PredictReadOptions): Promise<PredictBalance>;
  fetchPositions(
    params: FetchPortfolioPageParams,
    options?: PredictReadOptions,
  ): Promise<PredictPositionsPage>;
  fetchActivity(
    params: FetchPortfolioPageParams,
    options?: PredictReadOptions,
  ): Promise<PredictActivityPage>;
}

/** Trading is a write-adjacent capability: requests are never cached and
 * never blindly retried. Committing an approved Order Preview is the only
 * placement path; the backend is idempotent by Preview reference, so
 * repeating a Commit observes and reconciles one operation instead of
 * placing another. */
export interface VenueTradingAdapter {
  previewOrder(
    params: PredictOrderPreviewParams,
    options?: PredictReadOptions,
  ): Promise<PredictOrderPreview>;
  /** Commits an approved Order Preview and returns its canonical Order
   * Receipt. Sends the Preview reference only; every executable detail is
   * backend-owned. Safe to repeat for the same `previewId`, never automatic. */
  commitOrder(
    previewId: string,
    options?: PredictReadOptions,
  ): Promise<PredictOrderReceipt>;
}

export interface VenueMarketDataAdapter {
  fetchVenueStatus(options?: PredictReadOptions): Promise<PredictVenueStatus>;
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
}
