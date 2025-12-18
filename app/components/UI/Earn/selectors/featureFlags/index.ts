import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';
import {
  isValidWildcardTokenList,
  WildcardTokenList,
} from '../../utils/wildcardTokenList';

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
 * Selects the tokens to have conversion CTAs (spotlight) from remote config or local fallback.
 * Returns a wildcard list mapping chain IDs (or "*") to token symbols (or ["*"]).
 *
 * Supports wildcards:
 * - "*" as chain key: applies to all chains
 * - "*" in symbol array: blocks all tokens on that chain
 *
 * Examples:
 * - { "*": ["USDC"] }           - Have conversion CTAs for USDC on ALL chains
 * - { "0x1": ["*"] }            - Have conversion CTAs for ALL tokens on Ethereum mainnet
 * - { "0xa4b1": ["USDT", "DAI"] } - Have conversion CTAs for specific tokens on specific chain
 *
 * Remote flag takes precedence over local env var.
 * If both are unavailable, returns {} (no conversion CTAs).
 */
// TODO: Break out duplicated parsing logic for cta tokens and blocklist into helper.
export const selectMusdConversionCTATokens = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): WildcardTokenList => {
    // Try remote flag first (takes precedence)
    const remoteCtaTokens = remoteFeatureFlags?.earnMusdConversionCtaTokens;

    if (remoteCtaTokens) {
      try {
        const parsedRemote =
          typeof remoteCtaTokens === 'string'
            ? JSON.parse(remoteCtaTokens)
            : remoteCtaTokens;

        if (isValidWildcardTokenList(parsedRemote)) {
          return parsedRemote;
        }
        console.warn(
          'Remote earnMusdConversionCtaTokens produced invalid structure. ' +
            'Expected format: {"*":["USDC"],"0x1":["*"],"0xa4b1":["USDT","DAI"]}',
        );
      } catch (error) {
        console.warn(
          'Failed to parse remote earnMusdConversionCtaTokens:',
          error,
        );
      }
    }

    // Fallback to local env var
    try {
      const localEnvValue = process.env.MM_MUSD_CTA_TOKENS;

      if (localEnvValue) {
        const parsed = JSON.parse(localEnvValue);
        if (isValidWildcardTokenList(parsed)) {
          return parsed;
        }
        console.warn(
          'Local MM_MUSD_CTA_TOKENS produced invalid structure. ' +
            'Expected format: {"*":["USDC"],"0x1":["*"],"0xa4b1":["USDT","DAI"]}',
        );
      }
    } catch (error) {
      console.warn('Failed to parse MM_MUSD_CTA_TOKENS:', error);
    }

    // Default: no tokens to have conversion CTAs
    return {};
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
  (remoteFeatureFlags): WildcardTokenList => {
    // Try remote flag first (takes precedence)
    const remoteBlocklist =
      remoteFeatureFlags?.earnMusdConvertibleTokensBlocklist;

    if (remoteBlocklist) {
      try {
        const parsedRemote =
          typeof remoteBlocklist === 'string'
            ? JSON.parse(remoteBlocklist)
            : remoteBlocklist;

        if (isValidWildcardTokenList(parsedRemote)) {
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
      // TODO: Smoke test using local vars. Do after to avoid slowing down dev to restart server.
      const localEnvValue = process.env.MM_MUSD_CONVERTIBLE_TOKENS_BLOCKLIST;

      if (localEnvValue) {
        const parsed = JSON.parse(localEnvValue);
        if (isValidWildcardTokenList(parsed)) {
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
