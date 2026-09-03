import { TransactionType } from '@metamask/transaction-controller';
import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import type { FiatDepositAsset } from '../../../components/UI/Ramp/utils/fiatDepositAsset';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

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

export const selectRampsTransakWidgetUrlProxyEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    validatedVersionGatedFeatureFlag(
      remoteFeatureFlags?.rampsTransakWidgetUrlProxy,
    ) ?? false,
);

/**
 * Per-transaction-type fiat deposit asset override, from the same
 * `confirmations_pay_fiat` flag `@metamask/transaction-pay-controller` reads
 * when quoting, so Ramps scopes the deposit catalog to the settling asset.
 */
export const selectFiatDepositAssetOverride = createSelector(
  selectRemoteFeatureFlags,
  (flags) =>
    (
      flags?.confirmations_pay_fiat as {
        assetPerTransactionType?: Partial<
          Record<TransactionType, FiatDepositAsset>
        >;
      } | null
    )?.assetPerTransactionType,
);
