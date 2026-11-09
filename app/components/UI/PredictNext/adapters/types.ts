import type { SignOperationInput } from '../auth/signing/signOperationTypes';
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
  PredictOrderPreview,
  PredictOrderPreviewParams,
  PredictOrderReceipt,
  PredictPortfolioSummary,
  PredictPositionsPage,
  PredictReadOptions,
  PredictSearchResults,
  PredictVenueCatalog,
  PredictVenueStatus,
} from '../types';

export interface VenuePortfolioAdapter {
  fetchBalance(options?: PredictReadOptions): Promise<PredictBalance>;
  fetchPositions(
    params: FetchPositionsParams,
    options?: PredictReadOptions,
  ): Promise<PredictPositionsPage>;
  /** Totals over every holding, computed by the backend. */
  fetchPortfolioSummary(
    options?: PredictReadOptions,
  ): Promise<PredictPortfolioSummary>;
  fetchActivity(
    params: FetchPortfolioPageParams,
    options?: PredictReadOptions,
  ): Promise<PredictActivityPage>;
  /** Drops state the adapter holds for the current Predict User. */
  clearAccountState?(): void;
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
   * Receipt. Sends the Preview reference only. `signing` is the intent the
   * phone renders and signs. Safe to repeat for the same `previewId`, never
   * automatic. */
  commitOrder(
    previewId: string,
    signing: SignOperationInput,
    options?: PredictReadOptions,
  ): Promise<PredictOrderReceipt>;
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
