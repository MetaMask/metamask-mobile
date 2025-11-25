import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export interface RampsUnifiedBuyV1Config {
  active?: boolean;
  minimumVersion?: string;
}

const FLAG_KEY = 'rampsUnifiedBuyV1';

export const selectRampsUnifiedBuyV1Config = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const rampsUnifiedBuyV1Config = remoteFeatureFlags?.[FLAG_KEY];
    return (rampsUnifiedBuyV1Config ?? {}) as RampsUnifiedBuyV1Config;
  },
);

export const selectRampsUnifiedBuyV1ActiveFlag = createSelector(
  selectRampsUnifiedBuyV1Config,
  (rampsUnifiedBuyV1Config) => {
    const rampsUnifiedBuyV1ActiveFlag = rampsUnifiedBuyV1Config?.active;
    return rampsUnifiedBuyV1ActiveFlag ?? false;
  },
);

export const selectRampsUnifiedBuyV1MinimumVersionFlag = createSelector(
  selectRampsUnifiedBuyV1Config,
  (rampsUnifiedBuyV1Config) => {
    const rampsUnifiedBuyV1MinimumVersion =
      rampsUnifiedBuyV1Config?.minimumVersion;
    return rampsUnifiedBuyV1MinimumVersion ?? null;
  },
);
