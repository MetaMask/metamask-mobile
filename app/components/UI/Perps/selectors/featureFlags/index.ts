import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
  isVersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';
import type { RootState } from '../../../../../reducers';
import type { ButtonColorVariantName } from '../../utils/abTesting/types';

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
