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
  /** Commits an approved Order Preview and returns its canonical Order
   * Receipt. Sends the `create_order` bytes the phone renders and signs
   * from `signing`. Only the first dispatch may submit; all recovery uses
   * observeOrder and never reconstructs an approval. */
  commitOrder(
    previewId: string,
    signing: SignOperationInput,
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
