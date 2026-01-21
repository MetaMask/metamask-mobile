import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export interface RampsUnifiedBuyV2Config {
  active?: boolean;
  minimumVersion?: string;
}

const FLAG_KEY = 'rampsUnifiedBuyV2';

export const selectRampsUnifiedBuyV2Config = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const rampsUnifiedBuyV2Config = remoteFeatureFlags?.[FLAG_KEY];
    return (rampsUnifiedBuyV2Config ?? {}) as RampsUnifiedBuyV2Config;
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
