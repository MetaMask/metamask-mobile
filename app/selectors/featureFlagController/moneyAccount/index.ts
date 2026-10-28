import { getMoneyAccountPremiumVaultConfig } from '@metamask/money-account-utils';
import { createSelector } from 'reselect';

import { selectRemoteFeatureFlags } from '..';
import {
  isVersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
import type {
  VbaMarket,
  VbaSourceCurrency,
} from '../../../util/region/getVbaSourceCurrency';
import type { Hex } from '@metamask/utils';

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

/**
 * LaunchDarkly key: `money-movement-neobank`.
 * Client Config camelCases kebab-case keys before the app reads them, same as
 * `tokenDetailsTechnicalIndicators`. This is the key in `remoteFeatureFlags`.
 */
export const MONEY_MOVEMENT_NEOBANK_FLAG_KEY = 'moneyMovementNeobank' as const;

/** LaunchDarkly key: `money-movement-neobank-brl`. */
export const MONEY_MOVEMENT_NEOBANK_BRL_FLAG_KEY =
  'moneyMovementNeobankBrl' as const;

/** LaunchDarkly key: `money-movement-neobank-usd`. */
export const MONEY_MOVEMENT_NEOBANK_USD_FLAG_KEY =
  'moneyMovementNeobankUsd' as const;

interface MoneyMovementNeobankFlag extends VersionGatedFeatureFlag {
  chooseCurrency?: unknown;
  regionOverride?: unknown;
}

interface NeobankMarketFlag extends VersionGatedFeatureFlag {
  currency?: unknown;
  regions?: unknown;
}

/**
 * `validatedVersionGatedFeatureFlag` unwraps `{ name, value }` and then
 * returns only a boolean, which drops every other field. Recover the same
 * payload here so those fields can be read after the enabled + minimumVersion
 * gate. An unresolved threshold array matches neither shape and reads as off.
 *
 * @param remoteFlag - Raw flag value from RemoteFeatureFlagController.
 * @returns The version-gated object, including any extra fields, or undefined.
 */
function readGatedFlagPayload<T extends VersionGatedFeatureFlag>(
  remoteFlag: unknown,
): T | undefined {
  if (isVersionGatedFeatureFlag(remoteFlag)) {
    return remoteFlag as T;
  }

  if (
    typeof remoteFlag === 'object' &&
    remoteFlag !== null &&
    'value' in remoteFlag
  ) {
    const wrappedValue = (remoteFlag as { value?: unknown }).value;
    if (isVersionGatedFeatureFlag(wrappedValue)) {
      return wrappedValue as T;
    }
  }

  return undefined;
}

/**
 * Uppercase, trim, and dedupe country codes. Non-strings and blanks are dropped.
 * An empty result means no region is allowed.
 *
 * @param regions - Raw `regions` field from the flag payload.
 * @returns ISO 3166-1 alpha-2 codes safe to compare with a geolocation country.
 */
function normalizeVbaRegionCodes(regions: unknown): string[] {
  if (!Array.isArray(regions)) {
    return [];
  }

  const seen = new Set<string>();
  const codes: string[] = [];
  for (const region of regions) {
    if (typeof region !== 'string') {
      continue;
    }
    const code = region.trim().toUpperCase();
    if (!code || seen.has(code)) {
      continue;
    }
    seen.add(code);
    codes.push(code);
  }
  return codes;
}

/**
 * Trim and uppercase a country code from `regionOverride`. A missing,
 * non-string, or blank value is no override. Any non-blank string is kept.
 * This is a country code, not a currency.
 *
 * @param regionOverride - Raw `regionOverride` field from the flag payload.
 * @returns An uppercase country code, or undefined when there is no override.
 */
function normalizeVbaRegionOverride(
  regionOverride: unknown,
): string | undefined {
  if (typeof regionOverride !== 'string') {
    return undefined;
  }
  const code = regionOverride.trim().toUpperCase();
  return code || undefined;
}

export interface MoneyMovementNeobankRollout {
  /**
   * Whether this binary may offer new Virtual Bank Accounts. False when the
   * flag is missing, disabled, malformed, or older than `minimumVersion`.
   */
  isEnabled: boolean;
  /**
   * True when the user picks the account currency on Choose Currency. Only a
   * literal `true` enables it, and it is false whenever `isEnabled` is false.
   */
  chooseCurrency: boolean;
  /**
   * Country code used ahead of the IP location. Undefined when the field is
   * missing, not a string, blank, or the gate is closed.
   */
  regionOverride: string | undefined;
}

const NEOBANK_ROLLOUT_DISABLED: MoneyMovementNeobankRollout = {
  isEnabled: false,
  chooseCurrency: false,
  regionOverride: undefined,
};

/**
 * Global Virtual Bank Account switch from `moneyMovementNeobank`:
 * `{ enabled, minimumVersion, chooseCurrency, regionOverride }`. The countries
 * and currencies come from the per-currency flags in `selectNeobankMarkets`.
 *
 * @returns The rollout switch, or a disabled rollout.
 */
export const selectMoneyMovementNeobank = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): MoneyMovementNeobankRollout => {
    const remoteFlag = remoteFeatureFlags?.[MONEY_MOVEMENT_NEOBANK_FLAG_KEY];
    const payload = readGatedFlagPayload<MoneyMovementNeobankFlag>(remoteFlag);
    if (!payload || validatedVersionGatedFeatureFlag(payload) !== true) {
      return NEOBANK_ROLLOUT_DISABLED;
    }
    return {
      isEnabled: true,
      chooseCurrency: payload.chooseCurrency === true,
      regionOverride: normalizeVbaRegionOverride(payload.regionOverride),
    };
  },
);

function readNeobankMarket(
  remoteFlag: unknown,
  currency: VbaSourceCurrency,
): VbaMarket | undefined {
  const payload = readGatedFlagPayload<NeobankMarketFlag>(remoteFlag);
  if (
    !payload ||
    validatedVersionGatedFeatureFlag(payload) !== true ||
    typeof payload.currency !== 'string' ||
    payload.currency.trim().toUpperCase() !== currency
  ) {
    return undefined;
  }
  return { currency, regions: normalizeVbaRegionCodes(payload.regions) };
}

/**
 * Open per-currency markets, one LaunchDarkly flag per currency. A flag is
 * open when it passes the version gate and its `currency` matches its key.
 * Each key is read through its literal constant because the feature flag
 * registry check only resolves plain identifiers.
 *
 * @returns The open markets, BRL first.
 */
export const selectNeobankMarkets = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): VbaMarket[] =>
    [
      readNeobankMarket(
        remoteFeatureFlags?.[MONEY_MOVEMENT_NEOBANK_BRL_FLAG_KEY],
        'BRL',
      ),
      readNeobankMarket(
        remoteFeatureFlags?.[MONEY_MOVEMENT_NEOBANK_USD_FLAG_KEY],
        'USD',
      ),
    ].filter((market): market is VbaMarket => market !== undefined),
);

/**
 * Local escape hatch so engineers can open the live Bank account row from an
 * IP outside every market's `regions`. `moneyMovementNeobank` must still be
 * enabled. Set `MM_MONEY_VBA_GEO_BYPASS=true` in `.js.env` and restart Metro.
 *
 * @returns Whether the VBA geolocation requirement is bypassed.
 */
export function isVbaGeoBypassEnabled(): boolean {
  return process.env.MM_MONEY_VBA_GEO_BYPASS === 'true';
}

export const SUBSCRIPTION_MONEY_ACCOUNT_ORANGE_ENABLED_FLAG_KEY =
  'subscriptionMoneyAccountOrangeEnabled' as const;

/**
 * Gates the MetaMask Pro subscription flow (sign-up paywall, benefit sheets,
 * success screen, Pro landing page, plan management, and cancel flow).
 *
 * Set `MM_PRO_SUBSCRIPTION_FLOW_ENABLED=true` to force it on locally.
 */
export const selectProSubscriptionEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const localOverrideEnabled =
      process.env.MM_PRO_SUBSCRIPTION_FLOW_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.[SUBSCRIPTION_MONEY_ACCOUNT_ORANGE_ENABLED_FLAG_KEY];
    if (localOverrideEnabled) {
      return true;
    }
    if (typeof remoteFlag === 'boolean') {
      return remoteFlag;
    }
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
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
 * Premium Money Account vault contracts from `moneyAccountPremiumVaultConfig`.
 * `boringVault` is the pvmUSD share token. Missing or malformed flags yield
 * undefined.
 */
export const selectMoneyAccountPremiumVaultConfig = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    getMoneyAccountPremiumVaultConfig(
      remoteFeatureFlags as Record<string, unknown>,
    ),
);
