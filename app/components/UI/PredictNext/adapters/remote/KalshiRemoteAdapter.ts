import {
  parsePredictActivityPage,
  parsePredictBalance,
  parsePredictPositionsPage,
} from '../../contracts/v1/portfolio';
import { parsePredictOrderPreview } from '../../contracts/v1/trading';
import {
  parsePredictEvent,
  parsePredictFeed,
  parsePredictMarketHistory,
  parsePredictSearchResults,
  parsePredictVenueStatus,
} from '../../contracts/v1/marketData';
import { PredictError, PredictErrorCode } from '../../errors';
import { KALSHI_VENUE_ID } from '../../types';
import type {
  VenueMarketDataAdapter,
  VenuePortfolioAdapter,
  VenueTradingAdapter,
} from '../types';
import {
  type PredictApiReadTransport,
  PredictHttpError,
} from './PredictApiReadClient';

/** Backend canonical preview error codes → client error codes. */
const PREVIEW_ERROR_CODE_BY_BACKEND_CODE: Record<string, PredictErrorCode> = {
  market_not_found: PredictErrorCode.MARKET_NOT_FOUND,
  market_not_tradeable: PredictErrorCode.MARKET_NOT_TRADEABLE,
  quote_unavailable: PredictErrorCode.QUOTE_UNAVAILABLE,
  balance_unavailable: PredictErrorCode.BALANCE_UNAVAILABLE,
  insufficient_liquidity: PredictErrorCode.INSUFFICIENT_LIQUIDITY,
  insufficient_balance: PredictErrorCode.INSUFFICIENT_BALANCE,
};

const isAbortError = (error: unknown): error is Error =>
  error instanceof Error && error.name === 'AbortError';

/**
 * Compares two canonical decimal amounts by value: the backend echoes the
 * requested amount normalized to two decimals, so '20' and '20.00' are the
 * same amount and a naive string compare would reject valid echoes.
 */
const isSameAmount = (left: string, right: string): boolean =>
  left.replace(/(\.\d*?)0+$/u, '$1').replace(/\.$/u, '') ===
  right.replace(/(\.\d*?)0+$/u, '$1').replace(/\.$/u, '');

const mapError = (error: unknown): never => {
  if (isAbortError(error) || error instanceof PredictError) {
    throw error;
  }

  if (error instanceof TypeError) {
    throw PredictError.from(PredictErrorCode.NETWORK_ERROR);
  }

  if (error instanceof PredictHttpError) {
    if (error.status === 401) {
      throw PredictError.from(PredictErrorCode.UNAUTHENTICATED);
    }
    if (error.status === 429) {
      throw PredictError.from(PredictErrorCode.RATE_LIMITED);
    }
    if (error.status === 503) {
      throw PredictError.from(PredictErrorCode.VENUE_UNAVAILABLE);
    }
    if (error.status >= 500) {
      throw PredictError.from(PredictErrorCode.NETWORK_ERROR);
    }
  }

  throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
};

const mapTradingError = (error: unknown): never => {
  // The backend reports canonical preview failure codes in the body; they
  // describe product states the client renders, so they win over status.
  if (error instanceof PredictHttpError && error.bodyCode) {
    const mapped = PREVIEW_ERROR_CODE_BY_BACKEND_CODE[error.bodyCode];
    if (mapped) {
      throw PredictError.from(mapped);
    }
  }
  return mapError(error);
};

export class KalshiRemoteAdapter {
  readonly venueId = KALSHI_VENUE_ID;
  readonly marketData: VenueMarketDataAdapter;
  readonly portfolio: VenuePortfolioAdapter;
  readonly trading: VenueTradingAdapter;

  constructor(client: PredictApiReadTransport) {
    this.trading = {
      previewOrder: async (params, options) => {
        try {
          const value = await client.fetchOrderPreview(
            this.venueId,
            params,
            options,
          );
          const result = parsePredictOrderPreview(value);
          if (
            result.venueId !== this.venueId ||
            result.marketId !== params.marketId ||
            result.side !== params.side ||
            !isSameAmount(result.requestedAmount, params.amount)
          ) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapTradingError(error);
        }
      },
    };

    this.portfolio = {
      fetchBalance: async (options) => {
        try {
          const value = await client.fetchBalance(this.venueId, options);
          const result = parsePredictBalance(value);
          if (result.venueId !== this.venueId) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error);
        }
      },
      fetchPositions: async (params, options) => {
        try {
          const value = await client.fetchPositions(
            this.venueId,
            params,
            options,
          );
          const result = parsePredictPositionsPage(value);
          if (
            result.venueId !== this.venueId ||
            result.positions.some(
              (position) => position.venueId !== this.venueId,
            )
          ) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error);
        }
      },
      fetchActivity: async (params, options) => {
        try {
          const value = await client.fetchActivity(
            this.venueId,
            params,
            options,
          );
          const result = parsePredictActivityPage(value);
          if (
            result.venueId !== this.venueId ||
            result.activity.some((entry) => entry.venueId !== this.venueId)
          ) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error);
        }
      },
    };
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
      fetchFeed: async (feedId, params, options) => {
        try {
          const value = await client.fetchFeed(
            this.venueId,
            feedId,
            params,
            options,
          );
          const result = parsePredictFeed(value);
          if (
            result.venueId !== this.venueId ||
            result.id !== feedId ||
            result.events.some((event) => event.venueId !== this.venueId)
          ) {
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
      fetchMarketHistory: async (marketId, range, options) => {
        try {
          const value = await client.fetchMarketHistory(
            this.venueId,
            marketId,
            range,
            options,
          );
          const result = parsePredictMarketHistory(value);
          if (
            result.venueId !== this.venueId ||
            result.marketId !== marketId ||
            result.range !== range
          ) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error);
        }
      },
      searchEvents: async (params, options) => {
        try {
          const value = await client.searchEvents(
            this.venueId,
            params,
            options,
          );
          const result = parsePredictSearchResults(value);
          if (
            result.venueId !== this.venueId ||
            result.events.some((event) => event.venueId !== this.venueId)
          ) {
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
