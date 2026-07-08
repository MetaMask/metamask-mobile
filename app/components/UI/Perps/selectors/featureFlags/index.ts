import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
  isVersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';
import type { RootState } from '../../../../../reducers';
import type { ButtonColorVariantName } from '../../utils/abTesting/types';
import { hasProperty } from '@metamask/utils';
import { parseAllowlistAssets } from '../../utils/parseAllowlistAssets';

/**
 * Valid variants for button color A/B test (TAT-1937)
 * Used for runtime validation of LaunchDarkly responses
 */
const VALID_BUTTON_COLOR_VARIANTS: readonly ButtonColorVariantName[] = [
  'control',
  'monochrome',
];

export const selectPerpsEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_PERPS_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsPerpTradingEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

export const selectPerpsServiceInterruptionBannerEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag =
      process.env.MM_PERPS_SERVICE_INTERRUPTION_BANNER_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsPerpTradingServiceInterruptionBannerEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

export const selectPerpsGtmOnboardingModalEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_PERPS_GTM_MODAL_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsPerpGtmOnboardingModalEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Selector for Order Book feature flag
 * Controls visibility of the Order Book navigation in Market Details view
 *
 * @returns boolean - true if Order Book should be shown, false otherwise
 */
export const selectPerpsOrderBookEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    // Default to false if no flag is set (disabled by default)
    const localFlag = process.env.MM_PERPS_ORDER_BOOK_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsOrderBookEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Client-config / Redux key for the Perps advanced chart feature flag.
 * LaunchDarkly key (kebab-case): `perps-advanced-chart-enabled-v2`
 */
export const PERPS_ADVANCED_CHART_ENABLED_FLAG_KEY =
  'perpsAdvancedChartEnabledV2' as const;

/**
 * Selector for Perps advanced chart feature flag.
 * Controls whether market detail and fullscreen charts use the shared AdvancedChart
 * (TradingView) instead of the Lightweight Charts WebView.
 *
 * @returns boolean - true if advanced chart should be shown, false otherwise
 */
export const selectPerpsAdvancedChartEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag = remoteFeatureFlags?.[
      PERPS_ADVANCED_CHART_ENABLED_FLAG_KEY
    ] as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

/**
 * Client-config / Redux key for the Perps show full asset names feature flag.
 * LaunchDarkly key (kebab-case): `perps-show-full-asset-names`
 */
export const PERPS_SHOW_FULL_ASSET_NAMES_FLAG_KEY =
  'perpsShowFullAssetNames' as const;

/**
 * Selector for showing full asset names in Perps market row lists.
 * When enabled, vertical market lists display the full asset name (e.g. "Bitcoin")
 * instead of the ticker symbol (e.g. "BTC").
 *
 * @returns boolean - true if full asset names should be shown, false otherwise.
 */
export const selectPerpsShowFullAssetNamesFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag = remoteFeatureFlags?.[
      PERPS_SHOW_FULL_ASSET_NAMES_FLAG_KEY
    ] as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

/**
 * Selector for Related Markets rail feature flag.
 * Controls visibility of the discovery rail on Perps market details.
 *
 * @returns boolean - true if the related markets rail should be shown.
 */
export const selectPerpsRelatedMarketsEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    // Default to false if no flag is set (disabled by default)
    const localFlag = process.env.MM_PERPS_RELATED_MARKETS_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsRelatedMarkets as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Selector for the Market About section feature flag (TAT-2308).
 * Controls visibility of the "About" section on the Perps market details screen,
 * which shows a brief description of the underlying asset.
 *
 * Hidden by default: when no remote flag is set (and no local override), the
 * section is not rendered.
 *
 * @returns boolean - true if the About section should be shown, false otherwise
 */
export const selectPerpsMarketAboutEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    // Default to false if no flag is set (disabled by default)
    const localFlag = process.env.MM_PERPS_MARKET_ABOUT_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsMarketAboutEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Selector for button color A/B test variant from LaunchDarkly
 * TAT-1937: Tests impact of button colors (green/red vs white/white) on trading behavior
 *
 * @returns Variant name ('control' | 'monochrome') or null if test is disabled
 */
export const selectPerpsButtonColorTestVariant = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): string | null => {
    const remoteFlag = remoteFeatureFlags?.perpsAbtestButtonColor;

    // LaunchDarkly can return:
    // 1. A string variant name: 'control' or 'monochrome'
    // 2. A version-gated object: { enabled: true, minAppVersion: '7.60.0', variant: 'control' }
    // 3. null/undefined if test is disabled

    if (!remoteFlag) {
      return null;
    }

    // Direct string variant (simpler LaunchDarkly config)
    if (typeof remoteFlag === 'string') {
      // Validate variant is a known value
      if (
        VALID_BUTTON_COLOR_VARIANTS.includes(
          remoteFlag as ButtonColorVariantName,
        )
      ) {
        return remoteFlag; // Already a string, validated against known variants
      }
      return null;
    }

    // Check if it's a version-gated flag with variant
    if (isVersionGatedFeatureFlag(remoteFlag)) {
      // Validate version gating (enabled and version check)
      const isValid = validatedVersionGatedFeatureFlag(remoteFlag);

      if (!isValid) {
        return null;
      }

      // Safely access variant property if it exists
      if ('variant' in remoteFlag && typeof remoteFlag.variant === 'string') {
        // Validate variant is a known value
        if (
          VALID_BUTTON_COLOR_VARIANTS.includes(
            remoteFlag.variant as ButtonColorVariantName,
          )
        ) {
          return remoteFlag.variant; // Already a string, validated against known variants
        }
      }

      return null;
    }

    return null;
  },
);

/**
 * Selector for HIP-3 configuration version
 * Used by ConnectionManager to detect when HIP-3 config changes and trigger reconnection
 *
 * @param state - Redux root state
 * @returns number - Version increments when HIP-3 config changes
 */
export const selectHip3ConfigVersion = createSelector(
  (state: RootState) => state?.engine?.backgroundState?.PerpsController,
  (perpsController) => perpsController?.hip3ConfigVersion ?? 0,
);

/**
 * Selector for Perps Feedback feature flag
 * Controls visibility of the "Give feedback" button on Perps home screen
 *
 * @returns boolean - true if feedback button should be shown, false otherwise
 */
export const selectPerpsFeedbackEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_PERPS_FEEDBACK_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsFeedbackEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Selector for Perps Trade With Any Token feature flag
 * Controls visibility of the deposit flow in PerpsOrderView
 * When enabled, allows users to trade with any token by depositing first
 *
 * @returns boolean - true if trade with any token is enabled, false otherwise
 */
export const selectPerpsTradeWithAnyTokenEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag =
      process.env.MM_PERPS_TRADE_WITH_ANY_TOKEN_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsTradeWithAnyTokenIsEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Selector for Perps Pay With Any Token allowlist assets.
 * When non-empty, only tokens matching "chainId.address" entries in this list
 * are shown in the pay-with modal (in addition to the Perps balance option).
 * Env MM_PERPS_PAY_WITH_ANY_TOKEN_ALLOWLIST_ASSETS overrides the remote flag.
 *
 * If the remote LaunchDarkly value fails to parse (wrong format), returns []
 * so that the app falls back to allowing all tokens instead of blocking.
 *
 * @returns string[] - Normalized "chainId.address" entries (lowercase)
 */
export const selectPerpsPayWithAnyTokenAllowlistAssets = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): string[] => {
    const envValue =
      process.env.MM_PERPS_PAY_WITH_ANY_TOKEN_ALLOWLIST_ASSETS ?? '';
    const localList = parseAllowlistAssets(envValue);
    if (localList.length > 0) {
      return localList;
    }
    if (
      remoteFeatureFlags &&
      hasProperty(remoteFeatureFlags, 'perpsPayWithAnyTokenAllowlistAssets')
    ) {
      return parseAllowlistAssets(
        remoteFeatureFlags.perpsPayWithAnyTokenAllowlistAssets,
      );
    }
    return [];
  },
);

/**
 * Selector for Rewards Referral Code feature flag
 * Controls visibility of referral code in PnL hero card
 * Supports both boolean and version-gated JSON flag formats
 *
 * @returns boolean - true if referral code should be shown, false otherwise
 */
export const selectPerpsRewardsReferralCodeEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteFlag = remoteFeatureFlags?.rewardsReferralCodeEnabled;

    if (remoteFlag === undefined || remoteFlag === null) {
      return false;
    }

    // Handle simple boolean flag
    if (typeof remoteFlag === 'boolean') {
      return remoteFlag;
    }

    // Handle version-gated JSON flag
    const versionGatedFlag = remoteFlag as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(versionGatedFlag) ?? false;
  },
);

/**
 * Resolve whether the MYX provider is enabled.
 * Pure utility so that both the Redux selector and the controller
 * (which reads RemoteFeatureFlagController state directly) share
 * the same logic.
 *
 * Local env var takes priority — if set to "true", MYX is always enabled
 * regardless of remote flag. Remote flag only used as fallback when
 * local is not explicitly enabled.
 */
export function resolvePerpsMyxProviderEnabled(
  remoteFeatureFlags: Record<string, unknown> | undefined,
): boolean {
  const localFlag = process.env.MM_PERPS_MYX_PROVIDER_ENABLED === 'true';

  // Local override always wins
  if (localFlag) {
    return true;
  }

  const remoteFlag =
    remoteFeatureFlags?.perpsMyxProviderEnabled as VersionGatedFeatureFlag;

  return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
}

/**
 * Selector for MYX Provider enabled flag
 * Controls whether MYX is available as a provider option
 *
 * @returns boolean - true if MYX provider should be available, false otherwise
 */
export const selectPerpsMYXProviderEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => resolvePerpsMyxProviderEnabled(remoteFeatureFlags),
);

/**
 * Selector for Perps Products section feature flag
 * Controls visibility of the category pills grid on Perps home screen
 *
 * @returns boolean - true if Products section should be shown, false otherwise
 */
export const selectPerpsProductsEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.perpsProductsEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

/**
 * Selector for Perps Competition Banner feature flag
 * Controls visibility of the competition promotion banner on Perps home screen
 *
 * @returns boolean - true if competition banner should be shown, false otherwise
 */
export const selectPerpsCompetitionBannerEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.perpsCompetitionBannerEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

/**
 * Selector for Perps Top Movers feature flag
 * Controls visibility of the Top Movers (Gainers/Losers) section on the Perps home screen
 *
 * @returns boolean - true if Top Movers section should be shown, false otherwise
 */
export const selectPerpsTopMoversEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.perpsTopMoversEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

/**
 * Selector for Perps Watchlist redesign feature flag
 * Controls whether the redesigned Watchlist UI (empty state, suggested markets,
 * show-more/less, tappable header, animations, 10-asset limit) and the
 * watchlist filter pill in the markets list are shown.
 * When disabled, falls back to the pre-redesign plain watchlist list.
 *
 * @returns boolean - true if redesigned watchlist should be shown, false otherwise
 */
export const selectPerpsWatchlistEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.perpsWatchlistV2Enabled as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

/**
 * Selector for Terminal Backend feature flag.
 * Controls whether market-data calls route through the MetaMask Terminal API
 * (with HyperLiquid fallback) or go directly to HyperLiquid.
 *
 * @returns boolean - true if Terminal API should be used, false otherwise
 */
export const selectPerpsTerminalBackendEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.perpsTerminalBackendEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

/**
 * Selector for default pay token when no perps balance feature flag.
 * When enabled: preselect allowlist token with highest balance in Pay row when user has no perps balance,
 * and show "Add funds" CTA on market details when no token can be preselected.
 * When disabled: no default token preselection and no Add funds CTA (legacy behavior).
 * Controlled only by remote flag; when remote is missing or invalid, defaults to true.
 *
 * @returns boolean - true if feature is enabled, false otherwise
 */
export const selectPerpsDefaultPayTokenWhenNoBalanceEnabledFlag =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.perpsDefaultPayTokenWhenNoBalanceEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? true;
  });
