import type { PredictErrorCode } from '../errors';

export type PredictVenueId = string & { readonly __brand: 'PredictVenueId' };
export type PredictEntityId = string & { readonly __brand: 'PredictEntityId' };
export type PredictTimestamp = string & {
  readonly __brand: 'PredictTimestamp';
};

export const KALSHI_VENUE_ID = 'kalshi' as PredictVenueId;

export type PredictEntityStatus =
  | 'upcoming'
  | 'open'
  | 'closed'
  | 'resolved'
  | 'unavailable';

export type PredictOutcomeSide = 'yes' | 'no';

export interface PredictOutcome {
  venueId: PredictVenueId;
  id: PredictEntityId;
  marketId: PredictEntityId;
  side: PredictOutcomeSide;
  label: string;
}

export interface PredictMarket {
  venueId: PredictVenueId;
  id: PredictEntityId;
  eventId: PredictEntityId;
  question: string;
  outcomes: readonly [PredictOutcome, PredictOutcome];
  status: PredictEntityStatus;
  createdAt?: PredictTimestamp;
  updatedAt?: PredictTimestamp;
  opensAt?: PredictTimestamp;
  closesAt?: PredictTimestamp;
  resolvesAt?: PredictTimestamp;
}

export interface PredictEventSummary {
  venueId: PredictVenueId;
  id: PredictEntityId;
  title: string;
  subtitle?: string;
  startsAt?: PredictTimestamp;
  closesAt?: PredictTimestamp;
  updatedAt?: PredictTimestamp;
}

export interface PredictEvent extends PredictEventSummary {
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
  checkedAt: number;
  reason?: PredictErrorCode;
}

export interface PredictQueryDescriptor<TKey extends readonly unknown[]> {
  queryKey: TKey;
  family: readonly unknown[];
  staleTime: number;
  scope: 'venue';
}
