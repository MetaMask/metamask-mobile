import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export interface DepositConfig {
  providerApiKey?: string | null;
  providerFrontendAuth?: string | null;
  entrypoints?: {
    walletActions?: boolean;
  };
}

export const selectDepositConfig = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const depositConfig = remoteFeatureFlags?.depositConfig;
    return (depositConfig || {}) as DepositConfig;
  },
);

export const selectDepositProviderApiKey = createSelector(
  selectDepositConfig,
  (depositConfig) => {
    const depositProviderApiKey = depositConfig?.providerApiKey;
    return depositProviderApiKey ?? null;
  },
);
export const selectDepositProviderFrontendAuth = createSelector(
  selectDepositConfig,
  (depositConfig) => {
    const depositProviderFrontendAuth = depositConfig?.providerFrontendAuth;
    return depositProviderFrontendAuth ?? null;
  },
);
