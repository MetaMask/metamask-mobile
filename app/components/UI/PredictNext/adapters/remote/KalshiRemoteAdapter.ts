import {
  parsePredictEvent,
  parsePredictEventsPage,
  parsePredictVenueStatus,
} from '../../contracts/v1/marketData';
import { PredictError, PredictErrorCode } from '../../errors';
import { KALSHI_VENUE_ID } from '../../types';
import type { VenueMarketDataAdapter } from '../types';
import {
  type PredictApiReadTransport,
  PredictHttpError,
} from './PredictApiReadClient';

const isAbortError = (error: unknown): error is Error =>
  error instanceof Error && error.name === 'AbortError';

const mapError = (error: unknown): never => {
  if (isAbortError(error) || error instanceof PredictError) {
    throw error;
  }

  if (error instanceof PredictHttpError) {
    if (error.status === 429) {
      throw PredictError.from(PredictErrorCode.RATE_LIMITED);
    }
    if (error.status === 503) {
      throw PredictError.from(PredictErrorCode.VENUE_UNAVAILABLE);
    }
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }

  if (error instanceof TypeError) {
    throw PredictError.from(PredictErrorCode.NETWORK_ERROR);
  }

  throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
};

export class KalshiRemoteAdapter {
  readonly venueId = KALSHI_VENUE_ID;
  readonly marketData: VenueMarketDataAdapter;

  constructor(client: PredictApiReadTransport) {
    this.marketData = {
      fetchVenueStatus: async (options) => {
        try {
          const value = await client.fetchVenueStatus(this.venueId, options);
          const result = parsePredictVenueStatus(value);
          if (result.venueId !== this.venueId) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error);
        }
      },
      fetchEvents: async (params, options) => {
        try {
          const value = await client.fetchEvents(this.venueId, params, options);
          const result = parsePredictEventsPage(value);
          if (result.items.some((event) => event.venueId !== this.venueId)) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error);
        }
      },
      fetchEvent: async (eventId, options) => {
        try {
          const value = await client.fetchEvent(this.venueId, eventId, options);
          const result = parsePredictEvent(value);
          if (result.venueId !== this.venueId || result.id !== eventId) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error);
        }
      },
    };
  }
}
