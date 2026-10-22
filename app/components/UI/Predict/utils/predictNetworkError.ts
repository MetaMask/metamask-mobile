import Logger, { type LoggerErrorOptions } from '../../../../util/Logger';

/** Breadcrumb message used for Predict transient connectivity failures. */
export const PREDICT_NETWORK_ERROR_BREADCRUMB_MESSAGE =
  'Predict: transient network error';

/**
 * Minimum interval between two network-error breadcrumbs for the same call
 * site (context name + method). Polling reads such as getPrices would
 * otherwise fill Sentry's 100-item breadcrumb buffer while the device is
 * offline and push out the breadcrumbs that explain a real error.
 */
export const PREDICT_NETWORK_BREADCRUMB_THROTTLE_MS = 30_000;

/**
 * Patterns that identify transient connectivity failures rather than
 * application bugs. These surface differently across transports
 * (Android Cronet via nitro-fetch, RN default fetch, iOS URLSession) so we
 * match on the substrings each of them emits.
 *
 * Reported as breadcrumbs/warnings instead of Sentry errors, since they are
 * driven by the user's network conditions (DNS failures, timeouts, offline,
 * geo/ISP blocking) and are not actionable as crashes.
 */
const NETWORK_ERROR_PATTERNS: RegExp[] = [
  // Chromium/Cronet (Android nitro-fetch) net::ERR_* codes
  /net::ERR_/iu,
  /Cronet failed/iu,
  // React Native default fetch (OkHttp / iOS). Note: we intentionally do NOT
  // match the browser-only "Failed to fetch" phrasing here, because the Predict
  // providers throw many app-level errors like "Failed to fetch related tags"
  // for non-OK HTTP responses, which are actionable and must reach Sentry.
  /Network request failed/iu,
  // Common cross-platform connectivity phrases
  /connection (was |)(timed out|refused|reset|closed)/iu,
  // Client-side timeouts: fetchWithTimeout ("Polymarket request timed out"),
  // URLSession ("The request timed out."), RN ("Network request timed out"),
  // POSIX ("Operation timed out"), OkHttp (`java.net.SocketTimeoutException:
  // timeout`, or just its bare "timeout" message).
  // We deliberately do not match any "timeout"/"timed out" substring: an HTTP
  // 504 "Gateway Timeout" page is a server failure, and app-level waits such
  // as depositWallet's "Timed out waiting for … relayer transaction" are
  // write-path failures; both must reach Sentry.
  // Intentional: this also matches an HTTP 408 "Request Timeout" status text,
  // since 408 means the client did not finish sending in time (a client-side
  // timeout), unlike 504.
  // "Request timeout" (no "timed"), e.g. 408 status text; see note above.
  /\brequest timeout\b/iu,
  /\b(?:request|connection|operation) timed out\b/iu,
  /\bSocketTimeoutException\b/u,
  /^timeout$/iu,
  /\bETIMEDOUT\b/u,
  /network is unreachable/iu,
  /(the )?internet connection appears to be offline/iu,
  /name (not resolved|resolution failed)/iu,
  /could not (connect|resolve host)/iu,
];

/**
 * Messages that describe an HTTP response from a server (e.g. the
 * `Polymarket fetch returned non-JSON (status 504) from …: <html>…` error
 * built by parseJsonOrThrow in providers/polymarket/utils.ts, or a
 * "504 Gateway Time-out" status text). The server was reachable, so these
 * are never treated as connectivity noise, even when an error page body
 * contains timeout wording (e.g. Cloudflare 522 "Connection timed out").
 */
const HTTP_RESPONSE_ERROR_PATTERNS: RegExp[] = [
  /returned non-JSON \(status \d{3}\)/u,
  /\bgateway time-?out\b/iu,
];

/**
 * iOS: nitro-fetch (URLSession) rejects with the NSError description, e.g.
 * `Error Domain=NSURLErrorDomain Code=-1005 "The network connection was lost."`,
 * or the localizedDescription fallback form
 * `The operation couldn’t be completed. (NSURLErrorDomain error -1009.)`.
 * The localized text varies by device language, so we anchor on the domain
 * and numeric code instead. Only transport-level codes are listed; HTTP,
 * URL, cancellation and file errors (e.g. -999, -1002, -1011) still reach
 * Sentry.
 */
const NSURL_ERROR_CODE_PATTERN =
  /\bNSURLErrorDomain(?:\s+Code=|\s+error\s+)(-\d+)(?!\d)/u;
const NSURL_CONNECTIVITY_ERROR_CODES = new Set<number>([
  -1001, // NSURLErrorTimedOut
  -1003, // NSURLErrorCannotFindHost
  -1004, // NSURLErrorCannotConnectToHost
  -1005, // NSURLErrorNetworkConnectionLost
  -1006, // NSURLErrorDNSLookupFailed
  -1009, // NSURLErrorNotConnectedToInternet
  -1018, // NSURLErrorInternationalRoamingOff
  -1020, // NSURLErrorDataNotAllowed
  // TLS handshake failed: on these read paths it is driven by captive portals
  // and ISP/geo TLS interception. Parity with Android, where Cronet's
  // net::ERR_CERT_* / net::ERR_SSL_* are already matched by /net::ERR_/.
  -1200, // NSURLErrorSecureConnectionFailed
]);

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Extracts the NSURLErrorDomain code from an iOS NSError description.
 *
 * @param error - The caught error (Error, string, or unknown)
 * @returns The numeric code (e.g. -1009), or undefined when absent
 */
export function getNSURLErrorCode(error: unknown): number | undefined {
  const match = NSURL_ERROR_CODE_PATTERN.exec(getErrorMessage(error));
  return match ? Number(match[1]) : undefined;
}

/**
 * Determines whether an error represents a transient network/connectivity
 * failure (as opposed to an application bug). Used to avoid reporting
 * unactionable connectivity noise to Sentry.
 *
 * @param error - The caught error (Error, string, or unknown)
 * @returns true when the error looks like a connectivity failure
 */
export function isNetworkError(error: unknown): boolean {
  const message = getErrorMessage(error);
  if (!message) {
    return false;
  }
  const nsurlCode = getNSURLErrorCode(message);
  if (
    nsurlCode !== undefined &&
    NSURL_CONNECTIVITY_ERROR_CODES.has(nsurlCode)
  ) {
    return true;
  }
  if (HTTP_RESPONSE_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return false;
  }
  return NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Last breadcrumb timestamp per call site. The key is the call site
 * (`context.name:method`), not the error code or message: while offline,
 * one polling method produces at most one breadcrumb per window whatever
 * mix of NSURL/Cronet codes it hits. Bounded by the number of call sites.
 */
const lastNetworkBreadcrumbAt = new Map<string, number>();

/** Test helper: clears the network breadcrumb throttle state. */
export function resetPredictNetworkErrorThrottle(): void {
  lastNetworkBreadcrumbAt.clear();
}

function getThrottleKey(context: LoggerErrorOptions): string {
  const name = context.context?.name ?? 'unknown';
  const method = context.context?.data?.method;
  return `${name}:${typeof method === 'string' ? method : 'unknown'}`;
}

/**
 * Records an already-classified transient network error as a Sentry
 * breadcrumb (Logger.log), at most once per call site every
 * PREDICT_NETWORK_BREADCRUMB_THROTTLE_MS. Adds `nsurl_code` to the context
 * data when the error carries an iOS NSURLErrorDomain code.
 *
 * @param error - The caught network error
 * @param context - Logger error options (tags/context) for this call site
 */
export function recordPredictNetworkError(
  error: unknown,
  context: LoggerErrorOptions,
): void {
  const key = getThrottleKey(context);
  const now = Date.now();
  const last = lastNetworkBreadcrumbAt.get(key);
  if (
    last !== undefined &&
    now - last < PREDICT_NETWORK_BREADCRUMB_THROTTLE_MS
  ) {
    return;
  }
  lastNetworkBreadcrumbAt.set(key, now);

  const nsurlCode = getNSURLErrorCode(error);
  const breadcrumbContext: LoggerErrorOptions =
    nsurlCode === undefined
      ? context
      : {
          ...context,
          context: {
            name: context.context?.name ?? 'Predict',
            data: { ...context.context?.data, nsurl_code: nsurlCode },
          },
        };

  Logger.log(
    PREDICT_NETWORK_ERROR_BREADCRUMB_MESSAGE,
    getErrorMessage(error),
    breadcrumbContext,
  );
}

/**
 * Reports a caught Predict error: transient connectivity failures become a
 * (throttled) Sentry breadcrumb via Logger.log, everything else is sent with
 * Logger.error. Use on read/polling paths whose catch blocks would otherwise
 * report network drops as errors.
 *
 * @param error - The caught error (Error, string, or unknown)
 * @param context - Logger error options (tags/context) for this call site
 */
export function logPredictError(
  error: unknown,
  context: LoggerErrorOptions,
): void {
  const normalizedError =
    error instanceof Error ? error : new Error(String(error));
  if (isNetworkError(normalizedError)) {
    recordPredictNetworkError(normalizedError, context);
    return;
  }
  Logger.error(normalizedError, context);
}
