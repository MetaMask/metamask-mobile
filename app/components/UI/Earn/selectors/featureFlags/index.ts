import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';
import { Hex } from '@metamask/utils';
import { CONVERTIBLE_STABLECOINS_BY_CHAIN } from '../../constants/musd';
import {
  isValidPaymentTokenMap,
  convertSymbolAllowlistToAddresses,
  isValidWildcardBlocklist,
  WildcardBlocklist,
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
// TODO: Update: Should represent a list of tokens to have conversion CTAs (spotlight)
// TODO: Update: Break out duplicated parsing logic for allowlist and blocklist into helper.
// TODO: Delete if no longer needed. Will be replaced by CTA tokens list.
export const selectMusdConversionPaymentTokensAllowlist = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): Record<Hex, Hex[]> => {
    let localAllowlist: Record<Hex, Hex[]> | null = null;
    try {
      const localEnvValue = process.env.MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST;

      if (localEnvValue) {
        const parsed = JSON.parse(localEnvValue);
        const converted = convertSymbolAllowlistToAddresses(parsed);
        if (isValidPaymentTokenMap(converted)) {
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
          if (isValidPaymentTokenMap(converted)) {
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

/**
 * Selects the blocked payment tokens for mUSD conversion from remote config or local fallback.
 * Returns a wildcard blocklist mapping chain IDs (or "*") to token symbols (or ["*"]).
 *
 * Supports wildcards:
 * - "*" as chain key: applies to all chains
 * - "*" in symbol array: blocks all tokens on that chain
 *
 * Examples:
 * - { "*": ["USDC"] }           - Block USDC on ALL chains
 * - { "0x1": ["*"] }            - Block ALL tokens on Ethereum mainnet
 * - { "0xa4b1": ["USDT", "DAI"] } - Block specific tokens on specific chain
 *
 * Remote flag takes precedence over local env var.
 * If both are unavailable, returns {} (no blocking).
 */
export const selectMusdConversionPaymentTokensBlocklist = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): WildcardBlocklist => {
    // Try remote flag first (takes precedence)
    const remoteBlocklist =
      remoteFeatureFlags?.earnMusdConvertibleTokensBlocklist;

    if (remoteBlocklist) {
      try {
        const parsedRemote =
          typeof remoteBlocklist === 'string'
            ? JSON.parse(remoteBlocklist)
            : remoteBlocklist;

        if (isValidWildcardBlocklist(parsedRemote)) {
          return parsedRemote;
        }
        console.warn(
          'Remote earnMusdConvertibleTokensBlocklist produced invalid structure. ' +
            'Expected format: {"*":["USDC"],"0x1":["*"],"0xa4b1":["USDT","DAI"]}',
        );
      } catch (error) {
        console.warn(
          'Failed to parse remote earnMusdConvertibleTokensBlocklist:',
          error,
        );
      }
    }

    // Fallback to local env var
    try {
      const localEnvValue = process.env.MM_MUSD_CONVERTIBLE_TOKENS_BLOCKLIST;

      if (localEnvValue) {
        const parsed = JSON.parse(localEnvValue);
        if (isValidWildcardBlocklist(parsed)) {
          return parsed;
        }
        console.warn(
          'Local MM_MUSD_CONVERTIBLE_TOKENS_BLOCKLIST produced invalid structure. ' +
            'Expected format: {"*":["USDC"],"0x1":["*"],"0xa4b1":["USDT","DAI"]}',
        );
      }
    } catch (error) {
      console.warn(
        'Failed to parse MM_MUSD_CONVERTIBLE_TOKENS_BLOCKLIST:',
        error,
      );
    }

    // Default: no blocking
    return {};
  },
);
