import type {
  FetchEventsParams,
  PaginatedResult,
  PredictEntityId,
  PredictEvent,
  PredictReadOptions,
  PredictVenueStatus,
} from '../types';

export interface VenueMarketDataAdapter {
  fetchVenueStatus(options?: PredictReadOptions): Promise<PredictVenueStatus>;
  fetchEvents(
    params: FetchEventsParams,
    options?: PredictReadOptions,
  ): Promise<PaginatedResult<PredictEvent>>;
  fetchEvent(
    eventId: PredictEntityId,
    options?: PredictReadOptions,
  ): Promise<PredictEvent>;
}
