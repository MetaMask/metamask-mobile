import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export interface DepositConfig {
  providerApiKey?: string | null;
  providerFrontendAuth?: string | null;
  entrypoints?: {
    walletActions?: boolean;
  };
  minimumVersion?: string;
  active?: boolean;
  features?: {
    [key: string]: boolean | undefined | null;
  };
}

export const selectDepositConfig = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const depositConfig = remoteFeatureFlags?.depositConfig;
    return (depositConfig ?? {}) as DepositConfig;
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

export const selectDepositMinimumVersionFlag = createSelector(
  selectDepositConfig,
  (depositConfig) => {
    const depositMinimumVersion = depositConfig?.minimumVersion;
    return depositMinimumVersion ?? null;
  },
);

export const selectDepositActiveFlag = createSelector(
  selectDepositConfig,
  (depositConfig) => {
    const depositActiveFlag = depositConfig?.active;
    return depositActiveFlag ?? false;
  },
);

export const selectDepositEntrypoints = createSelector(
  selectDepositConfig,
  (depositConfig) => {
    const depositEntrypoints = depositConfig?.entrypoints;
    return depositEntrypoints;
  },
);

export const selectDepositEntrypointWalletActions = createSelector(
  selectDepositEntrypoints,
  (depositEntrypoints) => {
    const depositEntrypointWalletActions = depositEntrypoints?.walletActions;
    return depositEntrypointWalletActions ?? false;
  },
);

export const selectDepositFeatures = createSelector(
  selectDepositConfig,
  (depositConfig) => {
    const depositFeatures = depositConfig?.features;
    return depositFeatures ?? {};
  },
);
