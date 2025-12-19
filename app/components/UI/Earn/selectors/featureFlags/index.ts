import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';
import { Hex } from '@metamask/utils';
import { CONVERTIBLE_STABLECOINS_BY_CHAIN } from '../../constants/musd';
import {
  areValidAllowedPaymentTokens,
  convertSymbolAllowlistToAddresses,
} from '../../utils/musd';

export const selectPooledStakingEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_POOLED_STAKING_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnPooledStakingEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

export const selectPooledStakingServiceInterruptionBannerEnabledFlag =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags) => {
    const localFlag =
      process.env.MM_POOLED_STAKING_SERVICE_INTERRUPTION_BANNER_ENABLED ===
      'true';
    const remoteFlag =
      remoteFeatureFlags?.earnPooledStakingServiceInterruptionBannerEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  });

export const selectStablecoinLendingEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const localFlag = process.env.MM_STABLECOIN_LENDING_UI_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnStablecoinLendingEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

export const selectStablecoinLendingServiceInterruptionBannerEnabledFlag =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags) => {
    const localFlag =
      process.env.MM_STABLE_COIN_SERVICE_INTERRUPTION_BANNER_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnStablecoinLendingServiceInterruptionBannerEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  });

export const selectIsMusdConversionFlowEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_MUSD_CONVERSION_FLOW_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnMusdConversionFlowEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

export const selectIsMusdCtaEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_MUSD_CTA_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnMusdCtaEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Selector for the mUSD Quick Convert feature flag.
 * This flag enables the Quick Convert Token List screen where users can
 * quickly convert their existing tokens to mUSD via Max or Edit flows.
 *
 * IMPORTANT: Both this flag AND selectIsMusdConversionFlowEnabledFlag must be
 * enabled to show the Quick Convert feature. Use selectIsMusdQuickConvertFullyEnabled
 * for convenience.
 */
// TODO: Reminder: create LaunchDarkly flag for quick convert feature.
export const selectMusdQuickConvertEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_MUSD_QUICK_CONVERT_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnMusdQuickConvertEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Selector for the mUSD Quick Convert percentage.
 * Returns a number between 0 and 1 representing the percentage of balance to convert.
 *
 * - When `1.0`: Max mode (100% of balance, current behavior)
 * - When `< 1.0` (e.g., `0.90`): Percentage mode (90% of balance)
 *
 * This is a workaround for the Relay quote system using `EXPECTED_OUTPUT` trade type,
 * which adds fees on top of the requested amount causing insufficient funds for max conversions.
 * Using a percentage (e.g., 90%) leaves room for fees until Relay supports `EXACT_INPUT`.
 */
export const selectMusdQuickConvertPercentage = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): number => {
    const DEFAULT_PERCENTAGE = 1; // Max mode by default

    // Try remote flag first
    const remoteValue = remoteFeatureFlags?.earnMusdQuickConvertPercentage;
    if (
      typeof remoteValue === 'number' &&
      remoteValue > 0 &&
      remoteValue <= 1
    ) {
      return remoteValue;
    }

    // Fallback to local env variable
    const localValue = parseFloat(
      process.env.MM_MUSD_QUICK_CONVERT_PERCENTAGE ?? '',
    );
    if (!isNaN(localValue) && localValue > 0 && localValue <= 1) {
      return localValue;
    }

    return DEFAULT_PERCENTAGE;
  },
);

/**
 * Selects the allowed payment tokens for mUSD conversion from remote config or local fallback.
 * Returns a mapping of chain IDs to arrays of token addresses that users can pay with to convert to mUSD.
 *
 * The flag uses JSON format: { "hexChainId": ["tokenSymbol1", "tokenSymbol2"] }
 *
 * Example: { "0x1": ["USDC", "USDT"], "0xa4b1": ["USDC", "DAI"] }
 *
 * If both remote and local are unavailable, allows all supported payment tokens.
 */
export const selectMusdConversionPaymentTokensAllowlist = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): Record<Hex, Hex[]> => {
    let localAllowlist: Record<Hex, Hex[]> | null = null;
    try {
      const localEnvValue = process.env.MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST;

      if (localEnvValue) {
        const parsed = JSON.parse(localEnvValue);
        const converted = convertSymbolAllowlistToAddresses(parsed);
        if (areValidAllowedPaymentTokens(converted)) {
          localAllowlist = converted;
        } else {
          console.warn(
            'Local MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST produced invalid structure',
          );
        }
      }
    } catch (error) {
      console.warn(
        'Failed to parse MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST:',
        error,
      );
    }

    const remoteAllowlist =
      remoteFeatureFlags?.earnMusdConvertibleTokensAllowlist;

    if (remoteAllowlist) {
      try {
        const parsedRemote =
          typeof remoteAllowlist === 'string'
            ? JSON.parse(remoteAllowlist)
            : remoteAllowlist;

        if (
          parsedRemote &&
          typeof parsedRemote === 'object' &&
          !Array.isArray(parsedRemote)
        ) {
          const converted = convertSymbolAllowlistToAddresses(
            parsedRemote as Record<string, string[]>,
          );
          if (areValidAllowedPaymentTokens(converted)) {
            return converted;
          }
          console.warn(
            'Remote earnMusdConvertibleTokensAllowlist produced invalid structure',
          );
        }
      } catch (error) {
        console.warn(
          'Failed to parse remote earnMusdConvertibleTokensAllowlist. ' +
            'Expected JSON string format: {"0x1":["USDC","USDT"]}',
          error,
        );
      }
    }

    return localAllowlist || CONVERTIBLE_STABLECOINS_BY_CHAIN;
  },
);
