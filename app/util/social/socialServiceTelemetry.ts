import { addBreadcrumb } from '@sentry/react-native';
import type { LoggerErrorOptions } from '../Logger';

/**
 * Sentry tag value for Social product errors. Query in Sentry: `feature:social`.
 * Matches the Perps pattern (`feature:perps` in perpsConfig.ts).
 */
export const SOCIAL_SENTRY_FEATURE = 'social' as const;

/**
 * UI surface within the Social feature — used for Sentry filtering alongside `feature:social`.
 */
export type SocialSurface =
  | 'top_traders'
  | 'quick_buy'
  | 'trader_profile'
  | 'trader_position'
  | 'followed_traders'
  | 'follow';

/**
 * SocialService / SocialController operations we instrument.
 * Aligns with react-query `queryKey` prefixes and follow/unfollow messenger actions.
 */
export type SocialEndpoint =
  | 'leaderboard'
  | 'following'
  | 'open_positions'
  | 'closed_positions'
  | 'position_by_id'
  | 'trader_profile'
  | 'follow'
  | 'unfollow';

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
  /** Sentry Additional Data `message` — set from `extraMessage` (optionally via `formatSocialExtraMessage`). */
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

  // Match auth-specific terms only. The bare word "token" is intentionally
  // excluded because crypto wallet errors frequently mention tokens
  // (e.g. "unknown token contract", "tokenAddress invalid") and would
  // otherwise be misclassified as auth failures, polluting Sentry filters.
  if (/auth|jwt|unauthor|bearer/i.test(message)) {
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
 * The `extraMessage` string is preserved verbatim under `message` so
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
 *     extraMessage: 'useTopTraders: leaderboard fetch failed',
 *     endpoint: 'leaderboard',
 *     error: err,
 *   }),
 * );
 * ```
 */
export function buildSocialErrorExtras({
  extraMessage,
  endpoint,
  error,
  queryParams,
  durationMs,
}: {
  extraMessage: string;
  endpoint: SocialEndpoint;
  error: unknown;
  queryParams?: Record<string, string | number | boolean>;
  durationMs?: number;
}): Record<string, unknown> {
  const errorCategory = categoriseSocialError(error);
  const httpStatus = extractHttpStatus(error);
  const errorMessage =
    error instanceof Error ? error.message : String(error ?? '');

  return {
    message: extraMessage,
    endpoint,
    errorCategory,
    errorMessage,
    ...(httpStatus !== undefined && { httpStatus }),
    ...(durationMs !== undefined && { durationMs }),
    ...(queryParams !== undefined && { queryParams }),
  } satisfies SocialErrorExtras;
}

/**
 * Human-readable Sentry `extras.message` with an optional hook/component name.
 *
 * @example formatSocialExtraMessage('Error submitting QuickBuy tx', 'useQuickBuyBottomSheet')
 * // → 'Error submitting QuickBuy tx at useQuickBuyBottomSheet'
 */
export function formatSocialExtraMessage(
  message: string,
  source?: string,
): string {
  if (!source) {
    return message;
  }
  return `${message} at ${source}`;
}

/**
 * Build searchable Logger.error options for Social surfaces (Top Traders, Quick Buy, …).
 *
 * Pass `source` (hook or component name) to append `at {source}` to `extras.message`.
 * Sentry stack traces also show file/line; `source` helps Discover search and quick scans.
 *
 * @example
 * Logger.error(
 *   err,
 *   buildSocialLoggerErrorOptions({
 *     surface: 'quick_buy',
 *     operation: 'submit_tx',
 *     extraMessage: 'Error submitting QuickBuy tx',
 *     source: 'useQuickBuyBottomSheet',
 *     error: err,
 *   }),
 * );
 */
export function buildSocialLoggerErrorOptions({
  surface,
  operation,
  extraMessage,
  source,
  error,
  endpoint,
  queryParams,
  durationMs,
  extraTags,
}: {
  surface: SocialSurface;
  operation: string;
  /** Short human-readable description (without the `at {source}` suffix). */
  extraMessage: string;
  /** Hook, component, or function name appended as `at {source}` on extras.message. */
  source?: string;
  error: unknown;
  endpoint?: SocialEndpoint;
  queryParams?: Record<string, string | number | boolean>;
  durationMs?: number;
  extraTags?: Record<string, string | number>;
}): LoggerErrorOptions {
  const errorCategory = categoriseSocialError(error);
  const message = formatSocialExtraMessage(extraMessage, source);
  const extras: Record<string, unknown> = endpoint
    ? buildSocialErrorExtras({
        extraMessage: message,
        endpoint,
        error,
        queryParams,
        durationMs,
      })
    : {
        message,
        errorCategory,
        errorMessage:
          error instanceof Error ? error.message : String(error ?? ''),
        ...(queryParams !== undefined && { queryParams }),
        ...(durationMs !== undefined && { durationMs }),
      };

  return {
    tags: {
      feature: SOCIAL_SENTRY_FEATURE,
      surface,
      operation,
      errorCategory,
      ...(endpoint !== undefined && { endpoint }),
      ...(source !== undefined && { source }),
      ...extraTags,
    },
    context: {
      name: 'social',
      data: {
        operation,
        ...(source !== undefined && { source }),
        ...(endpoint !== undefined && { endpoint }),
        ...(queryParams !== undefined && { queryParams }),
      },
    },
    extras,
  };
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
