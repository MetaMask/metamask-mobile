import { isAxiosError, type AxiosResponse } from 'axios';
import { v4 as uuid } from 'uuid';
import Logger from '../../../../../util/Logger';
import {
  annotateTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../../util/trace';

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
  | 'network_error'
  | 'schema_error';

export interface CardApiErrorMeta {
  requestId?: string;
  outcome?: CardHttpOutcome;
}

export class CardApiError extends Error {
  readonly statusCode: number;
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
    super(`Card API error ${statusCode} on ${path}`);
    this.name = 'CardApiError';
    this.statusCode = statusCode;
    this.path = path;
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

/**
 * Map an HTTP status onto the card outcome taxonomy.
 * `schema_error` is assigned by callers when a 2xx body fails to parse.
 */
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
 * endpoints are always reported so an auth outage can page.
 */
export function shouldReportCardHttpFailure(
  endpoint: string,
  status: number,
  alwaysReportEndpoints: readonly string[] = [],
): boolean {
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
                request_id: requestId,
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
