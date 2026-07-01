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

export const MONEY_ENABLE_ONBOARDING_STEPPER_ANIMATION_FLAG_KEY =
  'moneyEnableOnboardingStepperAnimation' as const;

export const selectMoneyOnboardingStepperAnimationEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteFlag =
      remoteFeatureFlags?.[MONEY_ENABLE_ONBOARDING_STEPPER_ANIMATION_FLAG_KEY];
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
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

export const getMoneyAccountVaultConfig = (
  remoteFeatureFlags: Record<string, unknown> | undefined,
): MoneyAccountVaultConfig | undefined => {
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
};

export const selectMoneyAccountVaultConfig = createSelector(
  selectRemoteFeatureFlags,
  getMoneyAccountVaultConfig,
);

/**
 * Default withdrawal slippage tolerance in basis points (bps).
 * 0 means no percentage-based slippage — falls back to a fixed 1-unit
 * tolerance in the withdrawal builder. Set to e.g. 20 (0.2%) via the
 * `moneyAccountWithdrawalSlippageTolerance` LaunchDarkly flag to absorb
 * rate movement between encoding and on-chain execution.
 */
export const DEFAULT_WITHDRAWAL_SLIPPAGE_BPS = 0;

/**
 * Shape of the `moneyAccountWithdrawalSlippageTolerance` remote feature flag.
 * Using an object so we can add keys later without breaking existing deploys.
 * Validation is tolerant of additional/unknown keys.
 */
interface WithdrawalSlippageToleranceFlag {
  slippageBps?: number;
}

/**
 * Returns the withdrawal slippage tolerance in basis points from the
 * `moneyAccountWithdrawalSlippageTolerance` remote feature flag.
 *
 * The flag value is a JSON object, e.g. `{ slippageBps: 20 }` for 0.2%.
 * Falls back to {@link DEFAULT_WITHDRAWAL_SLIPPAGE_BPS} (0) when absent,
 * malformed, or when `slippageBps` is not a positive number. A value of 0
 * tells the withdrawal builder to use fixed 1-unit tolerance instead of
 * percentage-based slippage.
 */
export const selectMoneyAccountWithdrawalSlippageBps = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): number => {
    const raw = remoteFeatureFlags?.moneyAccountWithdrawalSlippageTolerance;
    if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
      const { slippageBps } = raw as WithdrawalSlippageToleranceFlag;
      if (typeof slippageBps === 'number' && slippageBps > 0) {
        return slippageBps;
      }
    }
    return DEFAULT_WITHDRAWAL_SLIPPAGE_BPS;
  },
);
