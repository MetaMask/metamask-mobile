import { createSelector } from 'reselect';
import { object, string, type Infer, create } from '@metamask/superstruct';
import { selectRemoteFeatureFlags } from '..';

export const ChompApiConfigStruct = object({
  baseUrl: string(),
});

export type ChompApiConfig = Infer<typeof ChompApiConfigStruct>;

/**
 * Parse an unknown value into a ChompApiConfig.
 *
 * Returns `undefined` if the value is nullish (flag not hydrated / not set),
 * throws if the value is present but doesn't match the schema.
 *
 * @param value - The raw feature flag value.
 * @returns The parsed config, or `undefined` if not set.
 */
export function parseChompApiConfig(
  value: unknown,
): ChompApiConfig | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return create(value, ChompApiConfigStruct);
}

/**
 * Selects the CHOMP API base URL from the `moneyAccountChompConfig` remote
 * feature flag.
 *
 * @returns The configured base URL, or `undefined` if the flag is unset or
 * malformed.
 */
export const selectChompApiBaseUrl = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    try {
      return parseChompApiConfig(remoteFeatureFlags.moneyAccountChompConfig)
        ?.baseUrl;
    } catch {
      return undefined;
    }
  },
);
