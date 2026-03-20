import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export interface RampsUnifiedBuyV2Config {
  active?: boolean;
  minimumVersion?: string;
}

const FLAG_KEY = 'rampsUnifiedBuyV2';

/**
 * Normalizes `rampsUnifiedBuyV2` from RemoteFeatureFlagController state.
 * Threshold-based LaunchDarkly flags are resolved to `{ name?, value }` where
 * `value` holds `{ active, minimumVersion }`. Non-threshold payloads and local
 * overrides use the flat `{ active, minimumVersion }` shape.
 */
export function resolveRampsUnifiedBuyV2Config(
  raw: unknown,
): RampsUnifiedBuyV2Config {
  if (raw === null || raw === undefined) {
    return {};
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const record = raw as Record<string, unknown>;
  if (
    'value' in record &&
    typeof record.value === 'object' &&
    record.value !== null &&
    !Array.isArray(record.value)
  ) {
    return record.value as RampsUnifiedBuyV2Config;
  }
  return raw as RampsUnifiedBuyV2Config;
}

export const selectRampsUnifiedBuyV2Config = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const raw = remoteFeatureFlags?.[FLAG_KEY];
    return resolveRampsUnifiedBuyV2Config(raw);
  },
);

export const selectRampsUnifiedBuyV2ActiveFlag = createSelector(
  selectRampsUnifiedBuyV2Config,
  (rampsUnifiedBuyV2Config) => {
    const rampsUnifiedBuyV2ActiveFlag = rampsUnifiedBuyV2Config?.active;
    return rampsUnifiedBuyV2ActiveFlag ?? false;
  },
);

export const selectRampsUnifiedBuyV2MinimumVersionFlag = createSelector(
  selectRampsUnifiedBuyV2Config,
  (rampsUnifiedBuyV2Config) => {
    const rampsUnifiedBuyV2MinimumVersion =
      rampsUnifiedBuyV2Config?.minimumVersion;
    return rampsUnifiedBuyV2MinimumVersion ?? null;
  },
);
