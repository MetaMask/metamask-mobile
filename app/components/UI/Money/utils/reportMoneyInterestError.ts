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

const reportedFailures = new Map<InterestWindow, string>();

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
 *
 * @param interestWindow - The interest window whose query failed.
 * @param error - The query error.
 */
export const reportMoneyInterestError = (
  interestWindow: InterestWindow,
  error: unknown,
): void => {
  const fingerprint = error instanceof Error ? error.message : String(error);
  if (reportedFailures.get(interestWindow) === fingerprint) {
    return;
  }
  reportedFailures.set(interestWindow, fingerprint);

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
 * reports again.
 *
 * @param interestWindow - The interest window whose query succeeded.
 */
export const clearReportedMoneyInterestError = (
  interestWindow: InterestWindow,
): void => {
  reportedFailures.delete(interestWindow);
};

/**
 * Test-only: resets dedupe state between cases.
 */
export const resetReportedMoneyInterestErrorsForTests = (): void => {
  reportedFailures.clear();
};
