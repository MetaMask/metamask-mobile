import { isAxiosError, type AxiosResponse } from 'axios';
import { v4 as uuid } from 'uuid';
import Logger from '../../../../../util/Logger';
import {
  annotateTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../../util/trace';
import { CardProviderError, CardProviderErrorCode } from '../provider-types';

const REDACTED = '[redacted]';

const UUID_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_SEGMENT = /^\d+$/;
const LONG_HEX_SEGMENT = /^(?:0x)?[0-9a-f]{16,}$/i;

export type CardHttpProvider = 'baanx' | 'immersve';

export type CardHttpOutcome =
  | 'success'
  | 'http_4xx'
  | 'rate_limited'
  | 'http_5xx'
  | 'timeout'
  | 'network_error';

export interface CardApiErrorMeta {
  requestId?: string;
  outcome?: CardHttpOutcome;
}

export class CardApiError extends Error {
  readonly statusCode: number;
  /** Normalized path. Id-like segments and query strings are stripped. */
  readonly path: string;
  /**
   * Kept for errorCode parsing. Non-enumerable so Sentry's
   * extraErrorDataIntegration does not serialize response bodies.
   */
  readonly responseBody!: string;
  readonly errorCode?: string;
  readonly requestId?: string;
  readonly outcome: CardHttpOutcome;
  /** Set once this failure has been sent to Sentry. */
  reported: boolean;

  constructor(
    statusCode: number,
    path: string,
    responseBody: string,
    meta?: CardApiErrorMeta,
  ) {
    const endpoint = normalizeCardEndpoint(path);
    super(`Card API error ${statusCode} on ${endpoint}`);
    this.name = 'CardApiError';
    this.statusCode = statusCode;
    this.path = endpoint;
    Object.defineProperty(this, 'responseBody', {
      value: responseBody,
      enumerable: false,
      writable: false,
    });
    this.errorCode = parseErrorCode(responseBody);
    this.requestId = meta?.requestId;
    this.outcome = meta?.outcome ?? classifyCardHttpOutcome(statusCode);
    this.reported = false;
  }
}

function parseErrorCode(body: string): string | undefined {
  try {
    const code = (JSON.parse(body) as { errorCode?: unknown }).errorCode;
    return typeof code === 'string' ? code : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Strip the query string and replace id-like path segments so endpoint tags
 * stay low-cardinality.
 */
export function normalizeCardEndpoint(path: string): string {
  const withoutQuery = path.split('?')[0] ?? path;
  return withoutQuery
    .split('/')
    .map((segment) => {
      if (
        UUID_SEGMENT.test(segment) ||
        NUMERIC_SEGMENT.test(segment) ||
        LONG_HEX_SEGMENT.test(segment)
      ) {
        return ':id';
      }
      return segment;
    })
    .join('/');
}

/** Map an HTTP status onto the card outcome taxonomy. */
export function classifyCardHttpOutcome(status: number): CardHttpOutcome {
  if (status >= 200 && status < 300) return 'success';
  if (status === 408) return 'timeout';
  if (status === 0) return 'network_error';
  if (status === 422 || status === 429) return 'rate_limited';
  if (status >= 500) return 'http_5xx';
  if (status >= 400) return 'http_4xx';
  return 'network_error';
}

/**
 * Routine 401s are retried by the controller. Failures of the listed refresh
 * endpoints are always reported so an auth outage can page. Statuses the
 * caller treats as a normal outcome (no card, closure already requested) are
 * not reported.
 */
export function shouldReportCardHttpFailure(
  endpoint: string,
  status: number,
  alwaysReportEndpoints: readonly string[] = [],
  unreportedStatuses: readonly number[] = [],
): boolean {
  if (unreportedStatuses.includes(status)) {
    return false;
  }
  if (status === 401 && !alwaysReportEndpoints.includes(endpoint)) {
    return false;
  }
  return true;
}

export function redactCardHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const redacted = { ...headers };
  if ('Authorization' in redacted) {
    redacted.Authorization = REDACTED;
  }
  if ('authorization' in redacted) {
    redacted.authorization = REDACTED;
  }
  if ('x-client-key' in redacted) {
    redacted['x-client-key'] = REDACTED;
  }
  return redacted;
}

export interface CardHttpCallParams<T> {
  provider: CardHttpProvider;
  serviceName: 'BaanxService' | 'ImmersveService';
  path: string;
  method: string;
  location: string;
  headers: Record<string, string>;
  /** Normalized paths whose 401s are still reported. */
  alwaysReportEndpoints?: readonly string[];
  /** Statuses that are expected product outcomes, not Sentry issues. */
  unreportedStatuses?: readonly number[];
  execute: () => Promise<Pick<AxiosResponse<T>, 'status' | 'data'>>;
}

/**
 * Shared choke point for a card provider HTTP call: request id, span, and one
 * Sentry issue per failure.
 */
export async function observeCardHttpCall<T>(
  params: CardHttpCallParams<T>,
): Promise<T> {
  const requestId = uuid();
  const endpoint = normalizeCardEndpoint(params.path);
  params.headers['x-mm-request-id'] = requestId;

  if (__DEV__) {
    Logger.log(`[${params.serviceName}]`, 'request', params.path, {
      method: params.method,
      headers: redactCardHeaders(params.headers),
      requestId,
    });
  }

  return trace(
    {
      name: TraceName.CardApiRequest,
      op: TraceOperation.CardDataFetch,
      tags: {
        card_endpoint: endpoint,
        card_method: params.method,
        card_provider: params.provider,
        card_location: params.location,
      },
    },
    async (context) => {
      try {
        const response = await params.execute();

        if (__DEV__) {
          Logger.log(`[${params.serviceName}]`, 'response', params.path, {
            status: response.status,
            requestId,
          });
        }

        annotateTrace(context, {
          card_http_status: response.status,
          card_outcome: classifyCardHttpOutcome(response.status),
        });

        return response.data;
      } catch (error) {
        if (!isAxiosError(error)) {
          throw error;
        }

        const status =
          error.response?.status ?? (error.code === 'ECONNABORTED' ? 408 : 0);
        const rawData = error.response?.data;
        const body =
          typeof rawData === 'string'
            ? rawData
            : rawData != null
              ? JSON.stringify(rawData)
              : '';
        const outcome = classifyCardHttpOutcome(status);
        const apiError = new CardApiError(status, params.path, body, {
          requestId,
          outcome,
        });

        annotateTrace(context, {
          card_http_status: status,
          card_outcome: outcome,
        });

        if (
          shouldReportCardHttpFailure(
            endpoint,
            status,
            params.alwaysReportEndpoints,
            params.unreportedStatuses,
          )
        ) {
          Logger.error(apiError, {
            tags: {
              feature: 'card',
              provider: params.provider,
              card_endpoint: endpoint,
              card_method: params.method,
              card_http_status: String(status),
              card_outcome: outcome,
              card_location: params.location,
              card_request_id: requestId,
            },
            context: {
              name: params.serviceName,
              data: {
                endpoint,
                httpStatus: status,
                outcome,
                errorCode: apiError.errorCode ?? null,
              },
            },
          });
          apiError.reported = true;
        }

        throw apiError;
      }
    },
  );
}

interface MappedCardApiError {
  code: CardProviderErrorCode;
  message: string;
  statusCode?: number;
  errorCode?: string;
}

function describeCardApiError(
  error: CardApiError,
  operation: string,
): MappedCardApiError {
  switch (error.statusCode) {
    case 401:
      return {
        code: CardProviderErrorCode.InvalidCredentials,
        message: `Authentication failed on ${operation}`,
        statusCode: error.statusCode,
      };
    case 403:
      return {
        code: CardProviderErrorCode.Forbidden,
        message: `Forbidden on ${operation}`,
        statusCode: 403,
        errorCode: error.errorCode,
      };
    case 404:
      return {
        code: CardProviderErrorCode.NotFound,
        message: `Not found: ${operation}`,
        statusCode: 404,
      };
    case 409:
      return {
        code: CardProviderErrorCode.Conflict,
        message: `Conflict on ${operation}`,
        statusCode: 409,
      };
    case 408:
      return {
        code: CardProviderErrorCode.Timeout,
        message: `Request timeout on ${operation}`,
        statusCode: 408,
      };
    case 429:
      return {
        code: CardProviderErrorCode.Unknown,
        message: `Rate limited on ${operation}`,
        statusCode: 429,
      };
    case 0:
      return {
        code: CardProviderErrorCode.Network,
        message: `Network error on ${operation}`,
        statusCode: 0,
      };
    default:
      if (error.statusCode >= 500) {
        return {
          code: CardProviderErrorCode.ServerError,
          message: `Server error on ${operation}`,
          statusCode: error.statusCode,
        };
      }
      return {
        code: CardProviderErrorCode.Unknown,
        message: error.message,
      };
  }
}

/** Translate an HTTP or provider error into the product error, once. */
export function toCardProviderError(
  error: unknown,
  operation: string,
): CardProviderError {
  if (error instanceof CardProviderError) return error;
  if (error instanceof CardApiError) {
    const mapped = describeCardApiError(error, operation);
    return new CardProviderError(
      mapped.code,
      mapped.message,
      mapped.statusCode,
      mapped.errorCode,
      { requestId: error.requestId, reported: error.reported },
    );
  }
  return new CardProviderError(
    CardProviderErrorCode.Unknown,
    (error as Error).message ?? `Unknown error on ${operation}`,
  );
}

export function readCardRequestId(error: unknown): string | null {
  if (error instanceof CardProviderError || error instanceof CardApiError) {
    return error.requestId ?? null;
  }
  return null;
}

/** Analytics fields for one cashback or credit wallet GET. No secrets. */
export function readWalletLoadFields(error?: unknown): {
  outcome: string;
  status_code: number | null;
  reason: string | null;
} {
  if (error === undefined) {
    return { outcome: 'success', status_code: null, reason: null };
  }
  if (error instanceof CardApiError) {
    return {
      outcome: error.outcome,
      status_code: error.statusCode,
      reason: error.errorCode ?? null,
    };
  }
  if (error instanceof CardProviderError) {
    return {
      outcome:
        typeof error.statusCode === 'number'
          ? classifyCardHttpOutcome(error.statusCode)
          : 'unknown',
      status_code: error.statusCode ?? null,
      reason: error.code,
    };
  }
  return { outcome: 'unknown', status_code: null, reason: 'unknown' };
}
