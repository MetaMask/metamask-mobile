import {
  composePredictPortfolioSummary,
  parsePredictActivityPage,
  parsePredictBalance,
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
import {
  predictErrorEvidence,
  type PredictErrorPhase,
} from '../../errors/apiErrorEvidence';
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

/** Canonical codes win over HTTP status, including authorization 403s. */
const ERROR_CODE_BY_BACKEND_CODE: Record<string, PredictErrorCode | undefined> = {
  operation_not_found: PredictErrorCode.ORDER_OUTCOME_UNKNOWN,
  preview_not_found: PredictErrorCode.ORDER_NOT_FOUND,
  market_not_found: PredictErrorCode.MARKET_NOT_FOUND,
  market_not_tradeable: PredictErrorCode.MARKET_NOT_TRADEABLE,
  quote_unavailable: PredictErrorCode.QUOTE_UNAVAILABLE,
  preview_expired: PredictErrorCode.PREVIEW_EXPIRED,
  balance_unavailable: PredictErrorCode.BALANCE_UNAVAILABLE,
  insufficient_balance: PredictErrorCode.INSUFFICIENT_BALANCE,
  insufficient_liquidity: PredictErrorCode.INSUFFICIENT_LIQUIDITY,
  insufficient_position: PredictErrorCode.INSUFFICIENT_POSITION,
  position_unavailable: PredictErrorCode.POSITION_UNAVAILABLE,
  venue_unavailable: PredictErrorCode.VENUE_UNAVAILABLE,
  venue_preview_mismatch: PredictErrorCode.ORDER_PREVIEW_MISMATCH,
  venue_authorization_malformed: PredictErrorCode.VENUE_SIGNING_REFUSED,
  venue_authorization_required: PredictErrorCode.UNAUTHENTICATED,
  venue_authorization_invalid: PredictErrorCode.UNAUTHENTICATED,
  venue_signature_expired: PredictErrorCode.VENUE_SIGNING_REFUSED,
  venue_step_changed: PredictErrorCode.VENUE_SIGNING_REFUSED,
  venue_account_not_enabled: PredictErrorCode.VENUE_ACCOUNT_NOT_ENABLED,
  venue_auth_rejected: PredictErrorCode.UNAUTHENTICATED,
  venue_signing_unavailable: PredictErrorCode.UNAUTHENTICATED,
  venue_signing_refused: PredictErrorCode.VENUE_SIGNING_REFUSED,
  venue_read_budget_exhausted: PredictErrorCode.VENUE_UNAVAILABLE,
  venue_profile_update_required: PredictErrorCode.APP_UPDATE_REQUIRED,
  venue_profile_not_ready: PredictErrorCode.VENUE_UNAVAILABLE,
  geo_blocked: PredictErrorCode.GEO_BLOCKED,
  invalid_request: PredictErrorCode.INVALID_RESPONSE,
  unauthorized: PredictErrorCode.UNAUTHENTICATED,
  venue_not_found: PredictErrorCode.UNSUPPORTED_VENUE,
  rate_limited: PredictErrorCode.RATE_LIMITED,
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
const toHttpErrorMetadata = (
  error: PredictHttpError,
  phase: PredictErrorPhase,
): Record<string, unknown> => ({
  status: error.status,
  ...(error.bodyCode === undefined ? {} : { bodyCode: error.bodyCode }),
  ...(error.requestSent === undefined
    ? {}
    : { requestSent: error.requestSent }),
  ...predictErrorEvidence(phase, error.bodyCode, error.requestSent),
});

const mapError = (
  error: unknown,
  phase: PredictErrorPhase = 'signed_read',
): never => {
  if (isAbortError(error) || error instanceof PredictError) {
    throw error;
  }

  if (error instanceof TypeError) {
    throw PredictError.from(PredictErrorCode.NETWORK_ERROR);
  }

  if (error instanceof PredictHttpError) {
    const metadata = toHttpErrorMetadata(error, phase);
    const mapped = error.bodyCode
      ? ERROR_CODE_BY_BACKEND_CODE[error.bodyCode]
      : undefined;
    if (mapped) {
      throw PredictError.from(mapped, { metadata });
    }
    if (error.status === 401) {
      throw PredictError.from(PredictErrorCode.UNAUTHENTICATED, { metadata });
    }
    // 403 is also used for authorization and unknown coded failures. Without
    // explicit geography evidence, do not invent a region restriction.
    if (error.status === 451) {
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
                  idempotencyKey: params.idempotencyKey,
                }
              : {
                  marketId: params.marketId,
                  side: params.side,
                  action: 'sell',
                  contracts: params.contracts,
                  idempotencyKey: params.idempotencyKey,
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
          return mapError(error, 'preview');
        }
      },
      // One signed submission per invocation; observation is observeOrder.
      commitOrder: async (previewId, signing, options) => {
        try {
          const value = await client.commitOrder(
            this.venueId,
            { previewId },
            options,
            signing,
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
          return mapError(error, 'commit');
        }
      },
      observeOrder: async (previewId, options) => {
        try {
          const value = await client.observeOrder(
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
          return mapError(error, 'observe');
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
      // The backend serves the holdings totals; the available balance is
      // the Balance route's value, so each route reads one venue page.
      fetchPortfolioSummary: async (options) => {
        try {
          const [holdings, balanceValue] = await Promise.all([
            client.fetchPortfolioSummary(this.venueId, options),
            client.fetchBalance(this.venueId, options),
          ]);
          const balance = parsePredictBalance(balanceValue);
          if (balance.venueId !== this.venueId) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          const result = composePredictPortfolioSummary(holdings, balance);
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
