import { addBreadcrumb } from '@sentry/react-native';

/**
 * The set of SocialService API endpoints we instrument.
 * Matches the `queryKey` prefixes used in the three hooks.
 */
export type SocialEndpoint =
  | 'leaderboard'
  | 'following'
  | 'open_positions'
  | 'closed_positions'
  | 'position_by_id';

/**
 * Coarse-grained error category derived from the thrown error shape.
 * Lets Sentry Discover filter errors without reading full messages.
 *
 * Categories map to distinct throw sites in SocialService:
 * - http_error   → SocialService.#throwIfNotOk (non-2xx HTTP response)
 * - schema_error → superstruct `is()` check on response body
 * - auth_failure → AuthenticationController:getBearerToken rejection
 * - network_error → fetch() itself rejected (no response received)
 * - unknown       → anything else
 */
export type SocialErrorCategory =
  | 'http_error'
  | 'schema_error'
  | 'auth_failure'
  | 'network_error'
  | 'unknown';

/**
 * The shape returned by buildSocialErrorExtras, intended to replace
 * the string second argument to Logger.error while preserving it.
 */
export interface SocialErrorExtras {
  /** Original log message — preserved verbatim for backward-compatible Sentry searches. */
  message: string;
  endpoint: SocialEndpoint;
  errorCategory: SocialErrorCategory;
  httpStatus?: number;
  durationMs?: number;
  queryParams?: Record<string, string | number | boolean>;
  errorMessage?: string;
}

/**
 * Extract the HTTP status from an error, if present.
 * HttpError from @metamask/controller-utils exposes `.httpStatus`.
 */
export function extractHttpStatus(error: unknown): number | undefined {
  if (
    error !== null &&
    typeof error === 'object' &&
    'httpStatus' in error &&
    typeof (error as Record<string, unknown>).httpStatus === 'number'
  ) {
    return (error as Record<string, unknown>).httpStatus as number;
  }
  return undefined;
}

/**
 * Categorise a thrown error into a coarse bucket so it can be
 * filtered in Sentry Discover without full-text searches.
 */
export function categoriseSocialError(error: unknown): SocialErrorCategory {
  if (extractHttpStatus(error) !== undefined) {
    return 'http_error';
  }

  const message = error instanceof Error ? error.message : String(error ?? '');

  if (/invalid response/i.test(message)) {
    return 'schema_error';
  }

  if (/auth|token|jwt|unauthor/i.test(message)) {
    return 'auth_failure';
  }

  if (/network|timed?\s*out|timeout|aborted|connect/i.test(message)) {
    return 'network_error';
  }

  return 'unknown';
}

/**
 * Build the enriched extras object for an existing Logger.error call.
 *
 * The `legacyMessage` string is preserved verbatim under `message` so
 * any existing Sentry searches on that string keep working. Structured
 * fields are added alongside without replacing the existing event.
 *
 * Usage — replace the string second arg while keeping the call intact:
 * ```ts
 * // Before
 * Logger.error(err, 'useTopTraders: leaderboard fetch failed');
 *
 * // After
 * Logger.error(
 *   err,
 *   buildSocialErrorExtras({
 *     legacyMessage: 'useTopTraders: leaderboard fetch failed',
 *     endpoint: 'leaderboard',
 *     error: err,
 *   }),
 * );
 * ```
 */
export function buildSocialErrorExtras({
  legacyMessage,
  endpoint,
  error,
  queryParams,
  durationMs,
}: {
  legacyMessage: string;
  endpoint: SocialEndpoint;
  error: unknown;
  queryParams?: Record<string, string | number | boolean>;
  durationMs?: number;
}): SocialErrorExtras {
  const errorCategory = categoriseSocialError(error);
  const httpStatus = extractHttpStatus(error);
  const errorMessage =
    error instanceof Error ? error.message : String(error ?? '');

  const extras: SocialErrorExtras = {
    message: legacyMessage,
    endpoint,
    errorCategory,
    errorMessage,
  };

  if (httpStatus !== undefined) {
    extras.httpStatus = httpStatus;
  }
  if (durationMs !== undefined) {
    extras.durationMs = durationMs;
  }
  if (queryParams !== undefined) {
    extras.queryParams = queryParams;
  }

  return extras;
}

/**
 * Add a Sentry breadcrumb when a SocialService fetch fails.
 *
 * The `message` string encodes discriminating fields inline so they are
 * searchable in Sentry Discover via `breadcrumbs.message:"..."`:
 *
 * social_service.leaderboard.failure status=401 category=http_error
 *
 * Sentry Discover query examples:
 * breadcrumbs.category:social_service
 * breadcrumbs.message:"social_service.leaderboard"
 * breadcrumbs.message:"status=401"
 * breadcrumbs.message:"category=auth_failure"
 */
export function addSocialBreadcrumb({
  endpoint,
  errorCategory,
  httpStatus,
  queryParams,
}: {
  endpoint: SocialEndpoint;
  errorCategory?: SocialErrorCategory;
  httpStatus?: number;
  queryParams?: Record<string, string | number | boolean>;
}): void {
  const parts: string[] = [`social_service.${endpoint}.failure`];

  if (httpStatus !== undefined) {
    parts.push(`status=${httpStatus}`);
  }
  if (errorCategory !== undefined) {
    parts.push(`category=${errorCategory}`);
  }

  addBreadcrumb({
    category: 'social_service',
    level: 'error',
    message: parts.join(' '),
    data: {
      endpoint,
      ...(httpStatus !== undefined && { httpStatus }),
      ...(errorCategory !== undefined && { errorCategory }),
      ...(queryParams !== undefined && { queryParams }),
    },
  });
}
