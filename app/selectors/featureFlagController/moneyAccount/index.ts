import { createSelector } from 'reselect';
import {
  isStrictHexString,
  isValidHexAddress,
  type Hex,
} from '@metamask/utils';
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

export const MONEY_ACCOUNT_DEPOSIT_QUOTE_PIPELINE_FLAG_KEY =
  'moneyAccountDepositQuotePipeline' as const;

export const selectMoneyAccountDepositQuotePipelineEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const localOverrideEnabled =
      process.env.MM_MONEY_ACCOUNT_DEPOSIT_QUOTE_PIPELINE_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.[MONEY_ACCOUNT_DEPOSIT_QUOTE_PIPELINE_FLAG_KEY];
    return (
      localOverrideEnabled ||
      (validatedVersionGatedFeatureFlag(remoteFlag) ?? false)
    );
  },
);

export const selectMoneyOnboardingStepperAnimationEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteFlag =
      remoteFeatureFlags?.[MONEY_ENABLE_ONBOARDING_STEPPER_ANIMATION_FLAG_KEY];
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

export interface MoneyAccountVaultConfig {
  chainId: Hex;
  boringVault: Hex;
  tellerAddress: Hex;
  accountantAddress: Hex;
  lensAddress: Hex;
}

export const DEV_VAULT_CONFIG: MoneyAccountVaultConfig = {
  chainId: '0x8f',
  boringVault: '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae',
  tellerAddress: '0x2D49EA58A4C70b62c8B56DE971310d9e999c8117',
  accountantAddress: '0x7382c5b8B51B8C4f127B3123C1039581BAA5A06B',
  lensAddress: '0xA816ECd922de94c6879AD23B9A884dB257F20947',
};

const VAULT_CONFIG_ADDRESS_KEYS = [
  'boringVault',
  'tellerAddress',
  'accountantAddress',
  'lensAddress',
] as const;

/**
 * Parses the raw `moneyAccountVaultConfig` remote feature flag into a config
 * whose chain id and addresses are known-good `Hex`.
 *
 * These addresses become the `spender` of an ERC-20 `approve` and the target of
 * the vault calls, so they are validated once here rather than asserted with
 * `as Hex` at every call site. A malformed flag yields `undefined`, which the
 * existing `if (!vaultConfig)` guards already treat as "Money is unavailable" —
 * the deposit and withdraw entry points stay hidden instead of failing partway
 * through a confirmation.
 * @param raw - The raw remote feature flag value.
 * @returns The parsed vault config, or `undefined` if any field is missing or
 * malformed.
 */
export const parseMoneyAccountVaultConfig = (
  raw: unknown,
): MoneyAccountVaultConfig | undefined => {
  if (typeof raw !== 'object' || raw === null) {
    return undefined;
  }

  const candidate = raw as Record<string, unknown>;
  const { chainId } = candidate;
  if (!isStrictHexString(chainId)) {
    return undefined;
  }

  const addresses = {} as Record<
    (typeof VAULT_CONFIG_ADDRESS_KEYS)[number],
    Hex
  >;
  for (const key of VAULT_CONFIG_ADDRESS_KEYS) {
    const value = candidate[key];
    // `isValidHexAddress` accepts all-lowercase or a valid ERC-55 checksum,
    // matching what ethers will accept when it encodes the calldata.
    if (!isStrictHexString(value) || !isValidHexAddress(value)) {
      return undefined;
    }
    addresses[key] = value;
  }

  return { chainId, ...addresses };
};

export const getMoneyAccountVaultConfig = (
  remoteFeatureFlags: Record<string, unknown> | undefined,
): MoneyAccountVaultConfig | undefined => {
  const remoteConfig = parseMoneyAccountVaultConfig(
    remoteFeatureFlags?.moneyAccountVaultConfig,
  );
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
