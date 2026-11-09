import {
  parsePredictActivityPage,
  parsePredictBalance,
  parsePredictPortfolioSummary,
  parsePredictPositionsPage,
} from '../../contracts/v1/portfolio';
import {
  parsePredictOrderPreview,
  parsePredictOrderReceipt,
} from '../../contracts/v1/trading';
import {
  parsePredictEvent,
  parsePredictFeed,
  parsePredictMarketHistory,
  parsePredictSearchResults,
  parsePredictVenueStatus,
} from '../../contracts/v1/marketData';
import { parsePredictVenueCatalog } from '../../contracts/v1/venueCatalog';
import { KALSHI_STATIC_VENUE_CATALOG } from '../../config/venueCatalogs';
import { PredictError, PredictErrorCode } from '../../errors';
import type { FetchOrderPreviewParams, PredictVenueId } from '../../types';
import type {
  VenueMarketDataAdapter,
  VenuePortfolioAdapter,
  VenueTradingAdapter,
} from '../types';
import {
  type PredictApiReadTransport,
  PredictHttpError,
} from './PredictApiReadClient';

/** Backend canonical trading error codes (preview and commit) → client
 * error codes. */
const TRADING_ERROR_CODE_BY_BACKEND_CODE: Record<string, PredictErrorCode> = {
  market_not_found: PredictErrorCode.MARKET_NOT_FOUND,
  market_not_tradeable: PredictErrorCode.MARKET_NOT_TRADEABLE,
  quote_unavailable: PredictErrorCode.QUOTE_UNAVAILABLE,
  preview_expired: PredictErrorCode.PREVIEW_EXPIRED,
  balance_unavailable: PredictErrorCode.BALANCE_UNAVAILABLE,
  insufficient_balance: PredictErrorCode.INSUFFICIENT_BALANCE,
  insufficient_liquidity: PredictErrorCode.INSUFFICIENT_LIQUIDITY,
  insufficient_position: PredictErrorCode.INSUFFICIENT_POSITION,
  position_unavailable: PredictErrorCode.POSITION_UNAVAILABLE,
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

/**
 * Keeps the HTTP status and the backend's canonical code for diagnosis.
 * Never the response body.
 */
const toHttpErrorMetadata = ({
  status,
  bodyCode,
}: PredictHttpError): Record<string, unknown> =>
  bodyCode === undefined ? { status } : { status, bodyCode };

const mapError = (error: unknown): never => {
  if (isAbortError(error) || error instanceof PredictError) {
    throw error;
  }

  if (error instanceof TypeError) {
    throw PredictError.from(PredictErrorCode.NETWORK_ERROR);
  }

  if (error instanceof PredictHttpError) {
    const metadata = toHttpErrorMetadata(error);
    if (error.status === 401) {
      throw PredictError.from(PredictErrorCode.UNAUTHENTICATED, { metadata });
    }
    // A 451, or a 403 from the backend or its edge, refuses the user's
    // region. Retrying cannot change that.
    if (error.status === 403 || error.status === 451) {
      throw PredictError.from(PredictErrorCode.GEO_BLOCKED, { metadata });
    }
    if (error.status === 429) {
      throw PredictError.from(PredictErrorCode.RATE_LIMITED, { metadata });
    }
    if (error.status === 503) {
      throw PredictError.from(PredictErrorCode.VENUE_UNAVAILABLE, {
        metadata,
      });
    }
    if (error.status >= 500) {
      throw PredictError.from(PredictErrorCode.NETWORK_ERROR, { metadata });
    }
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE, { metadata });
  }

  throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
};

const mapTradingError = (error: unknown): never => {
  // The backend reports canonical trading failure codes in the body; they
  // describe product states the client renders, so they win over status.
  if (error instanceof PredictHttpError && error.bodyCode) {
    const mapped = TRADING_ERROR_CODE_BY_BACKEND_CODE[error.bodyCode];
    if (mapped) {
      throw PredictError.from(mapped, {
        metadata: toHttpErrorMetadata(error),
      });
    }
  }
  return mapError(error);
};

/** Kalshi's Venue ID. Only Kalshi's adapter and its composition name it;
 * every other caller takes the Venue from the Active Venue, a route, or an
 * intent. */
export const KALSHI_VENUE_ID = 'kalshi' as PredictVenueId;

export class KalshiRemoteAdapter {
  readonly venueId = KALSHI_VENUE_ID;
  readonly marketData: VenueMarketDataAdapter;
  readonly portfolio: VenuePortfolioAdapter;
  readonly trading: VenueTradingAdapter;

  constructor(client: PredictApiReadTransport) {
    this.trading = {
      previewOrder: async (params, options) => {
        try {
          // Version tolerance (ADR-0001): the deployed backend's strict
          // request schema rejects unknown keys, so a buy keeps the exact
          // PRED-1194 body without `action`; only a sell carries the
          // discriminator.
          const wireParams: FetchOrderPreviewParams =
            params.action === 'buy'
              ? {
                  marketId: params.marketId,
                  side: params.side,
                  amount: params.amount,
                }
              : {
                  marketId: params.marketId,
                  side: params.side,
                  action: 'sell',
                  contracts: params.contracts,
                };
          const value = await client.fetchOrderPreview(
            this.venueId,
            wireParams,
            options,
          );
          const result = parsePredictOrderPreview(value);
          const isQuotedForIntent = (() => {
            if (
              result.venueId !== this.venueId ||
              result.marketId !== params.marketId ||
              result.side !== params.side ||
              result.action !== params.action
            ) {
              return false;
            }
            if (params.action === 'buy') {
              // The backend echoes the requested amount normalized to two
              // decimals, so '20' and '20.00' are the same amount.
              return (
                result.action === 'buy' &&
                isSameAmount(result.requestedAmount, params.amount)
              );
            }
            return (
              result.action === 'sell' &&
              result.requestedContracts === Number(params.contracts)
            );
          })();
          if (!isQuotedForIntent) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapTradingError(error);
        }
      },
      // One network attempt per invocation; observation and reconciliation
      // re-commit deliberately, never automatically.
      commitOrder: async (previewId, options) => {
        try {
          const value = await client.commitOrder(
            this.venueId,
            { previewId },
            options,
          );
          const result = parsePredictOrderReceipt(value);
          if (
            result.venueId !== this.venueId ||
            result.previewId !== previewId
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
      fetchPortfolioSummary: async (options) => {
        try {
          const value = await client.fetchPortfolioSummary(
            this.venueId,
            options,
          );
          const result = parsePredictPortfolioSummary(value);
          if (result.venueId !== this.venueId) {
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
      // Static client config until PRED-1403 serves the catalog from the
      // Predict API; only this method changes then.
      fetchVenueCatalog: async () =>
        parsePredictVenueCatalog(KALSHI_STATIC_VENUE_CATALOG, this.venueId),
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
