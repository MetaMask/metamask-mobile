import type { InterestWindow } from '@metamask/money-account-api-data-service';
import Logger from '../../../../util/Logger';

export const LIFETIME_EARNINGS_SENTRY_FEATURE_TAG = 'money-lifetime-earnings';

/**
 * Diagnostics carried by Money Account API errors. The data service redacts
 * addresses from `responseBody` and allowlists `responseHeaders`.
 */
export interface MoneyApiErrorDetails {
  errorName?: string;
  httpStatus?: number;
  responseBody?: string | null;
  responseHeaders?: Record<string, string>;
}

/**
 * Prefix for the premium vault's dedupe key. Base queries keep the window
 * alone, so a recovered base query cannot clear a premium failure.
 */
const PREMIUM_INTEREST_FAILURE_KEY_PREFIX = 'premium';

type MoneyInterestFailureKeyPrefix = typeof PREMIUM_INTEREST_FAILURE_KEY_PREFIX;

type MoneyInterestFailureKey =
  | InterestWindow
  | `${MoneyInterestFailureKeyPrefix}:${InterestWindow}`;

const reportedFailures = new Map<MoneyInterestFailureKey, string>();

const failureKey = (
  interestWindow: InterestWindow,
  failureKeyPrefix?: MoneyInterestFailureKeyPrefix,
): MoneyInterestFailureKey =>
  failureKeyPrefix === undefined
    ? interestWindow
    : `${failureKeyPrefix}:${interestWindow}`;

/**
 * Extracts Money Account API diagnostics from a query error.
 *
 * @param error - The query error.
 * @returns The diagnostics that are present on the error.
 */
export const getMoneyApiErrorDetails = (
  error: unknown,
): MoneyApiErrorDetails => {
  if (typeof error !== 'object' || error === null) {
    return {};
  }

  const { name, httpStatus, responseBody, responseHeaders } = error as Record<
    string,
    unknown
  >;
  return {
    ...(typeof name === 'string' ? { errorName: name } : {}),
    ...(typeof httpStatus === 'number' ? { httpStatus } : {}),
    ...(typeof responseBody === 'string' || responseBody === null
      ? { responseBody }
      : {}),
    ...(typeof responseHeaders === 'object' && responseHeaders !== null
      ? { responseHeaders: responseHeaders as Record<string, string> }
      : {}),
  };
};

/**
 * Reports an interest query failure to Sentry at most once per window and
 * error message, so refetches during an outage don't flood Sentry. Lifetime
 * (since inception) failures get their own feature tag for alerting.
 * Premium passes a key prefix so it does not share the base window entry.
 *
 * @param interestWindow - The interest window whose query failed.
 * @param error - The query error.
 * @param failureKeyPrefix - Set for the premium vault. Base queries omit it.
 */
export const reportMoneyInterestError = (
  interestWindow: InterestWindow,
  error: unknown,
  failureKeyPrefix?: MoneyInterestFailureKeyPrefix,
): void => {
  const key = failureKey(interestWindow, failureKeyPrefix);
  const fingerprint = error instanceof Error ? error.message : String(error);
  if (reportedFailures.get(key) === fingerprint) {
    return;
  }
  reportedFailures.set(key, fingerprint);

  const isLifetime = interestWindow === 'since_inception';
  const sentryError = new Error(
    isLifetime
      ? '[Money Account] Lifetime earnings fetch failed'
      : '[Money Account] Interest fetch failed',
  );
  (sentryError as Error & { cause: unknown }).cause = error;

  const details = getMoneyApiErrorDetails(error);
  Logger.error(sentryError, {
    tags: {
      feature: isLifetime ? LIFETIME_EARNINGS_SENTRY_FEATURE_TAG : 'money',
      ...(details.httpStatus === undefined
        ? {}
        : { httpStatus: String(details.httpStatus) }),
    },
    context: {
      name: 'money_interest',
      data: { window: interestWindow },
    },
    extras: { ...details },
  });
};

/**
 * Clears the dedupe entry once a window's query recovers, so a later failure
 * reports again. Premium passes the same key prefix used when reporting.
 *
 * @param interestWindow - The interest window whose query succeeded.
 * @param failureKeyPrefix - Set for the premium vault. Base queries omit it.
 */
export const clearReportedMoneyInterestError = (
  interestWindow: InterestWindow,
  failureKeyPrefix?: MoneyInterestFailureKeyPrefix,
): void => {
  reportedFailures.delete(failureKey(interestWindow, failureKeyPrefix));
};

/**
 * Test-only: resets dedupe state between cases.
 */
export const resetReportedMoneyInterestErrorsForTests = (): void => {
  reportedFailures.clear();
};
