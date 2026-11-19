import { isPlainObject } from '@metamask/utils';
import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const SENTRY_FLAG_KEY = 'sentry';

export interface SentryTransactionSampleRate {
  android?: number;
  ios?: number;
  /** Epoch milliseconds; the sampler ignores the entry from this time on. */
  expiresAt: number;
}

export type SentryTransactionSampleRates = Record<
  string,
  SentryTransactionSampleRate
>;

const EMPTY_RATES: SentryTransactionSampleRates = Object.freeze({});

const isValidRate = (rate: unknown): rate is number =>
  typeof rate === 'number' && rate >= 0 && rate <= 1;

/**
 * Parses `{ transactionSampleRates: { [traceName]: { android?, ios?, expiresAt } } }`
 * from the controller-processed `sentry` flag. An entry needs a parseable
 * `expiresAt` date string and at least one rate in [0, 1] (Sentry drops a
 * transaction on an invalid rate instead of falling back). Expiry is not
 * checked here because this result is memoized.
 *
 * @param value - Processed remote feature flag value.
 * @returns Rates by trace name; empty when missing or malformed.
 */
export function parseSentryTransactionSampleRates(
  value: unknown,
): SentryTransactionSampleRates {
  const rates = isPlainObject(value) ? value.transactionSampleRates : undefined;
  if (!isPlainObject(rates)) {
    return EMPTY_RATES;
  }

  const result: SentryTransactionSampleRates = {};
  for (const [name, entry] of Object.entries(rates)) {
    if (!isPlainObject(entry) || typeof entry.expiresAt !== 'string') {
      continue;
    }
    const expiresAt = Date.parse(entry.expiresAt);
    if (Number.isNaN(expiresAt)) {
      continue;
    }
    const parsed: SentryTransactionSampleRate = { expiresAt };
    if (isValidRate(entry.android)) {
      parsed.android = entry.android;
    }
    if (isValidRate(entry.ios)) {
      parsed.ios = entry.ios;
    }
    if (parsed.android !== undefined || parsed.ios !== undefined) {
      result[name] = parsed;
    }
  }
  return result;
}

export const selectSentryTransactionSampleRates = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    parseSentryTransactionSampleRates(remoteFeatureFlags[SENTRY_FLAG_KEY]),
);
