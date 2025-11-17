import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';
import { Hex } from '@metamask/utils';
import { CONVERTIBLE_STABLECOINS_BY_CHAIN } from '../../constants/musd';
import { convertSymbolAllowlistToAddresses } from '../../utils/musd';

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
        localAllowlist = convertSymbolAllowlistToAddresses(parsed);
      }
    } catch (error) {
      console.warn(
        'Failed to parse MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST:',
        error,
      );
    }

    // RemoteFeatureFlagController already parses the flag.
    const remoteAllowlist =
      remoteFeatureFlags?.earnMusdConvertibleTokensAllowlist;

    if (remoteAllowlist) {
      try {
        const parsedRemote =
          typeof remoteAllowlist === 'string'
            ? JSON.parse(remoteAllowlist)
            : remoteAllowlist;

        // Validate it's an object (not array) before passing to converter
        if (
          parsedRemote &&
          typeof parsedRemote === 'object' &&
          !Array.isArray(parsedRemote)
        ) {
          return convertSymbolAllowlistToAddresses(
            parsedRemote as Record<string, string[]>,
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
