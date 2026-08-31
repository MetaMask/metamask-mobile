import type {
  FetchFeedParams,
  PredictEntityId,
  PredictEvent,
  PredictFeed,
  PredictFeedId,
  PredictReadOptions,
  PredictVenueStatus,
} from '../types';

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
}
