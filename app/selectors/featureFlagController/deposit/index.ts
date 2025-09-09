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
    // TODO: Remove hardcoded values - added for testing
    const hardcodedApiKey = "a9d9cc56-a524-4dd7-8008-59f36bd6fa97";
    console.log('__ DEBUG__ selectDepositProviderApiKey returning hardcoded value:', hardcodedApiKey);
    return hardcodedApiKey;
    
    // Original logic (commented out for testing):
    // const depositProviderApiKey = depositConfig?.providerApiKey;
    // return depositProviderApiKey ?? null;
  },
);
export const selectDepositProviderFrontendAuth = createSelector(
  selectDepositConfig,
  (depositConfig) => {
    // TODO: Remove hardcoded values - added for testing
    const hardcodedFrontendAuth = "9TRUtEM_RLns4Tp7h34wtvA2h*yc2ty2EhChtWtAdRko!EpVrpvH26xf_YJPM_qqiEG4LsL7TJiB6wg79BjtLGHdaKu6gHsceDHQ";
    console.log('__ DEBUG__ selectDepositProviderFrontendAuth returning hardcoded value:', hardcodedFrontendAuth);
    return hardcodedFrontendAuth;
    
    // Original logic (commented out for testing):
    // const depositProviderFrontendAuth = depositConfig?.providerFrontendAuth;
    // return depositProviderFrontendAuth ?? null;
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
