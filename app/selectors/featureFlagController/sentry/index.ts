import { isPlainObject } from '@metamask/utils';
import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const SENTRY_FLAG_KEY = 'sentry';

export type SentryTransactionSampleRates = Record<
  string,
  Record<string, number>
>;

const EMPTY_RATES: SentryTransactionSampleRates = Object.freeze({});

/**
 * Parses `{ transactionSampleRates: { [traceName]: { [Platform.OS]: rate } } }`
 * from the controller-processed `sentry` flag, keeping only rates in [0, 1]
 * (Sentry drops a transaction on an invalid rate instead of falling back).
 *
 * @param value - Processed remote feature flag value.
 * @returns Rates by trace name and platform; empty when missing or malformed.
 */
export function parseSentryTransactionSampleRates(
  value: unknown,
): SentryTransactionSampleRates {
  const rates = isPlainObject(value) ? value.transactionSampleRates : undefined;
  if (!isPlainObject(rates)) {
    return EMPTY_RATES;
  }

  const result: SentryTransactionSampleRates = {};
  for (const [name, byPlatform] of Object.entries(rates)) {
    if (!isPlainObject(byPlatform)) {
      continue;
    }
    for (const [platform, rate] of Object.entries(byPlatform)) {
      if (typeof rate === 'number' && rate >= 0 && rate <= 1) {
        result[name] = { ...result[name], [platform]: rate };
      }
    }
  }
  return result;
}

export const selectSentryTransactionSampleRates = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    parseSentryTransactionSampleRates(remoteFeatureFlags[SENTRY_FLAG_KEY]),
);
