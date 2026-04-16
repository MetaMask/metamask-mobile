import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

const DEFAULT_CHOMP_API_URL = 'https://chomp.api.cx.metamask.io';

export interface ChompApiConfig {
  baseUrl: string;
}

export const selectChompApiConfig = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): ChompApiConfig => {
    const remoteConfig = remoteFeatureFlags?.chompApiConfig as unknown as
      | ChompApiConfig
      | undefined;
    if (remoteConfig?.baseUrl) {
      return remoteConfig;
    }
    return { baseUrl: DEFAULT_CHOMP_API_URL };
  },
);

export const selectChompApiBaseUrl = createSelector(
  selectChompApiConfig,
  (chompApiConfig) => chompApiConfig.baseUrl,
);
