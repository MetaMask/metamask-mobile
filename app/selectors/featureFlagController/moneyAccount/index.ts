import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

interface MoneyAccountFeatureFlag {
  moneyAccountDepositEnabled?: boolean;
  moneyAccountWithdrawEnabled?: boolean;
}

export const selectMoneyAccountDepositEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const flag =
      remoteFeatureFlags?.moneyAccount as unknown as MoneyAccountFeatureFlag;
    return flag?.moneyAccountDepositEnabled ?? false;
  },
);

export const selectMoneyAccountWithdrawEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const flag =
      remoteFeatureFlags?.moneyAccount as unknown as MoneyAccountFeatureFlag;
    return flag?.moneyAccountWithdrawEnabled ?? false;
  },
);

export interface MoneyAccountVaultConfig {
  chainId: string;
  boringVault: string;
  tellerAddress: string;
  accountantAddress: string;
  lensAddress: string;
}

export const DEV_VAULT_CONFIG: MoneyAccountVaultConfig = {
  chainId: '0x8f',
  boringVault: '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae',
  tellerAddress: '0x2D49EA58A4C70b62c8B56DE971310d9e999c8117',
  accountantAddress: '0x7382c5b8B51B8C4f127B3123C1039581BAA5A06B',
  lensAddress: '0xA816ECd922de94c6879AD23B9A884dB257F20947',
};

/**
 * Selects whether the money account address display is enabled.
 * This is a version-gated feature flag that shows the money account address
 * (with copy and block explorer buttons) in the "Add..." bottom sheet
 * instead of the "Coming soon" placeholder.
 */
export const selectMoneyShowMoneyAccountAddress = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag = remoteFeatureFlags?.moneyShowMoneyAccountAddress;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

export const selectMoneyAccountVaultConfig = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): MoneyAccountVaultConfig | undefined => {
    const remoteConfig =
      remoteFeatureFlags?.moneyAccountVaultConfig as unknown as
        | MoneyAccountVaultConfig
        | undefined;
    if (remoteConfig) {
      return remoteConfig;
    }
    const devFallbackEnabled =
      process.env.MM_MONEY_DEPOSIT_CONFIG_DEV_ENABLED === 'true';
    return devFallbackEnabled ? DEV_VAULT_CONFIG : undefined;
  },
);
