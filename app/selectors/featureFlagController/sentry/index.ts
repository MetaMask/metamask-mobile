import { isPlainObject } from '@metamask/utils';
import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const SENTRY_FLAG_KEY = 'sentry';

export type SentryTraceSampleRates = Record<string, Record<string, number>>;

const EMPTY_RATES: SentryTraceSampleRates = Object.freeze({});

/**
 * Parses `{ traceSampleRates: { [traceName]: { [Platform.OS]: rate } } }`
 * from the controller-processed `sentry` flag, keeping only rates in [0, 1]
 * (Sentry drops a trace on an invalid rate instead of falling back).
 *
 * @param value - Processed remote feature flag value.
 * @returns Rates by trace name and platform; empty when missing or malformed.
 */
export function parseSentryTraceSampleRates(
  value: unknown,
): SentryTraceSampleRates {
  const rates = isPlainObject(value) ? value.traceSampleRates : undefined;
  if (!isPlainObject(rates)) {
    return EMPTY_RATES;
  }

  const result: SentryTraceSampleRates = {};
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

export const selectSentryTraceSampleRates = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    parseSentryTraceSampleRates(remoteFeatureFlags[SENTRY_FLAG_KEY]),
);
