export type PredictVenueId = string & { readonly __brand: 'PredictVenueId' };
export type PredictEntityId = string & { readonly __brand: 'PredictEntityId' };
export type PredictTimestamp = string & {
  readonly __brand: 'PredictTimestamp';
};
export type PredictDecimal = string & { readonly __brand: 'PredictDecimal' };

export const KALSHI_VENUE_ID = 'kalshi' as PredictVenueId;

export type PredictEntityStatus =
  | 'upcoming'
  | 'open'
  | 'closed'
  | 'resolved'
  | 'unavailable';

export type PredictOutcomeSide = 'yes' | 'no';

export interface PredictOutcome {
  id: PredictEntityId;
  side: PredictOutcomeSide;
  label: string;
  askPrice?: PredictDecimal;
  bidPrice?: PredictDecimal;
}

export interface PredictMarket {
  id: PredictEntityId;
  question: string;
  outcomes: readonly [PredictOutcome, PredictOutcome];
  status: PredictEntityStatus;
  createdAt?: PredictTimestamp;
  updatedAt?: PredictTimestamp;
  opensAt?: PredictTimestamp;
  closesAt?: PredictTimestamp;
  resolvesAt?: PredictTimestamp;
}

export interface PredictEvent {
  venueId: PredictVenueId;
  id: PredictEntityId;
  title: string;
  subtitle?: string;
  startsAt?: PredictTimestamp;
  closesAt?: PredictTimestamp;
  updatedAt?: PredictTimestamp;
  description?: string;
  markets: readonly PredictMarket[];
}

export interface FetchEventsParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: readonly T[];
  nextCursor?: string;
}

export interface PredictVenueStatus {
  venueId: PredictVenueId;
  status: 'available' | 'degraded' | 'unavailable';
  checkedAt: PredictTimestamp;
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
