import { createSelector } from 'reselect';
import {
  selectLocalOverrides,
  selectRawFeatureFlags,
  selectRemoteFeatureFlags,
} from '../../../../../selectors/featureFlagController';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';
import { PredictFeedBannerConfig, PredictHotTabFlag } from '../../types/flags';
import {
  DEFAULT_HOT_TAB_FLAG,
  DEFAULT_PREDICT_FEED_BANNER_FLAG,
} from '../../constants/flags';
import { unwrapRemoteFeatureFlag } from '../../utils/flags';
import { resolvePredictFeatureFlags } from '../../utils/resolvePredictFeatureFlags';
import { parse, PredictFeedBannerSchema } from '../../schemas';

/**
 * Selector for Predict trading feature enablement
 *
 * Uses version-gated feature flag `predictTradingEnabled` from remote config.
 * Falls back to `true` if remote flag is unavailable or invalid.
 *
 * Version gating ensures users have minimum app version (7.60.0) to access feature.
 *
 * @returns {boolean} True if feature is enabled and version requirement is met
 */
export const selectPredictEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag = unwrapRemoteFeatureFlag<VersionGatedFeatureFlag>(
      remoteFeatureFlags?.predictTradingEnabled,
    );

    // Default to `true` if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? true;
  },
);

export const selectPredictGtmOnboardingModalEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_PREDICT_GTM_MODAL_ENABLED === 'true';
    const remoteFlag = unwrapRemoteFeatureFlag<VersionGatedFeatureFlag>(
      remoteFeatureFlags?.predictGtmOnboardingModalEnabled,
    );

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Variant options for the Predict home featured section
 */
export type PredictHomeFeaturedVariant = 'carousel' | 'list';

/**
 * Feature flag interface for Predict home featured variant
 * Extends VersionGatedFeatureFlag to include version gating
 */
export interface PredictHomeFeaturedVariantFlag
  extends VersionGatedFeatureFlag {
  variant: PredictHomeFeaturedVariant;
}

/**
 * Selector for Predict home featured variant
 *
 * Uses version-gated feature flag `predictHomeFeaturedVariant` from remote config.
 * Falls back to `'carousel'` if remote flag is unavailable, invalid, or version
 * requirement is not met.
 *
 * @returns {PredictHomeFeaturedVariant} The variant to display ('carousel' or 'list')
 */
export const selectPredictHomeFeaturedVariant = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): PredictHomeFeaturedVariant => {
    const remoteFlag = unwrapRemoteFeatureFlag<PredictHomeFeaturedVariantFlag>(
      remoteFeatureFlags?.predictHomeFeaturedVariant,
    );

    const isEnabled = validatedVersionGatedFeatureFlag(remoteFlag);

    if (!isEnabled) {
      return 'carousel';
    }

    if (remoteFlag?.variant === 'list') {
      return 'list';
    }

    return 'carousel';
  },
);

export const selectPredictHotTabFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): PredictHotTabFlag => {
    const flag = unwrapRemoteFeatureFlag<PredictHotTabFlag>(
      remoteFeatureFlags?.predictHotTab,
    );

    if (!flag || !validatedVersionGatedFeatureFlag(flag)) {
      return DEFAULT_HOT_TAB_FLAG;
    }

    // Validate queryParams is a string if present (prevents malformed URLs)
    if (
      flag.queryParams !== undefined &&
      typeof flag.queryParams !== 'string'
    ) {
      return DEFAULT_HOT_TAB_FLAG;
    }

    return flag;
  },
);

export const selectPredictFeatureFlags = createSelector(
  selectRawFeatureFlags,
  selectLocalOverrides,
  (remoteFeatureFlags, localOverrides) =>
    resolvePredictFeatureFlags({ remoteFeatureFlags, localOverrides }),
);

export const selectExtendedSportsMarketsLeagues = createSelector(
  selectPredictFeatureFlags,
  (flags) => flags.extendedSportsMarketsLeagues,
);

export const selectNonRegTimeSportsMarketTypes = createSelector(
  selectPredictFeatureFlags,
  (flags) => flags.nonRegTimeSportsMarketTypes,
);

export const selectPredictFeeCollectionFlag = createSelector(
  selectPredictFeatureFlags,
  (flags) => flags.feeCollection,
);

export const selectPredictFakOrdersEnabledFlag = createSelector(
  selectPredictFeatureFlags,
  (flags) => flags.fakOrdersEnabled,
);

export const selectPredictWithAnyTokenEnabledFlag = createSelector(
  selectPredictFeatureFlags,
  (flags) => flags.predictWithAnyTokenEnabled,
);

export const selectPredictUpDownEnabledFlag = createSelector(
  selectPredictFeatureFlags,
  (flags) => flags.predictUpDownEnabled,
);

export const selectPredictWorldCupConfig = createSelector(
  selectPredictFeatureFlags,
  (flags) => flags.predictWorldCup,
);

export const selectPredictWimbledonTabFlag = createSelector(
  selectPredictFeatureFlags,
  (flags) => flags.predictWimbledonTab,
);

export const selectPredictWorldCupEnabledFlag = createSelector(
  selectPredictWorldCupConfig,
  (config) => config.enabled,
);

export const selectPredictWorldCupMainFeedBannerEnabledFlag = createSelector(
  selectPredictWorldCupConfig,
  (config) => config.enabled && config.showMainFeedBanner,
);

export const selectPredictWorldCupMainFeedTabEnabledFlag = createSelector(
  selectPredictWorldCupConfig,
  (config) => config.enabled && config.showMainFeedTab,
);

export const selectPredictWorldCupScreenEnabledFlag = createSelector(
  selectPredictWorldCupConfig,
  (config) => config.enabled && config.showWorldCupScreen,
);

export const selectPredictWorldCupHubV2EnabledFlag = createSelector(
  selectPredictWorldCupConfig,
  (config) => config.enabled && config.showWorldCupScreen && config.showHubV2,
);

// The banner is only mounted inside the V2 hub (`PredictWorldCupHub`), so it
// must also require `showHubV2`. Without this, enabling `showHubBanner` while
// `showHubV2` is off would silently render nothing (the V1 hub has no banner).
export const selectPredictWorldCupHubBannerEnabledFlag = createSelector(
  selectPredictWorldCupConfig,
  (config) =>
    config.enabled &&
    config.showWorldCupScreen &&
    config.showHubV2 &&
    config.showHubBanner,
);

export const selectPredictPortfolioEnabledFlag = createSelector(
  selectPredictFeatureFlags,
  (flags) => flags.predictPortfolioEnabled,
);

export const selectPredictHomeRedesignEnabledFlag = createSelector(
  selectPredictFeatureFlags,
  (flags) => flags.predictHomeRedesignEnabled,
);

export const selectPredictSportCardLivePricesEnabledFlag = createSelector(
  selectPredictFeatureFlags,
  (flags) => flags.predictSportCardLivePricesEnabled,
);

export const selectPredictFeaturedCarouselEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    validatedVersionGatedFeatureFlag(
      unwrapRemoteFeatureFlag<VersionGatedFeatureFlag>(
        remoteFeatureFlags?.predictTabFeaturedCarousel,
      ),
    ) ?? false,
);

export const selectPredictFeedBannerConfig = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): PredictFeedBannerConfig => {
    const parsedFlag = parse(
      unwrapRemoteFeatureFlag<PredictFeedBannerConfig>(
        remoteFeatureFlags?.predictFeedBanner,
      ),
      PredictFeedBannerSchema,
      DEFAULT_PREDICT_FEED_BANNER_FLAG,
    );

    if (
      !validatedVersionGatedFeatureFlag(parsedFlag) ||
      !parsedFlag.id.trim() ||
      !parsedFlag.title.trim() ||
      !parsedFlag.description.trim()
    ) {
      return DEFAULT_PREDICT_FEED_BANNER_FLAG;
    }

    return parsedFlag;
  },
);

/**
 * Selector for Predict BottomSheet enablement
 *
 * Uses version-gated feature flag `predictBottomSheet` from remote config.
 * When enabled, buy/sell previews render inside a BottomSheet overlay
 * instead of navigating to full-screen pages.
 * Falls back to `false` if remote flag is unavailable or invalid.
 *
 * @returns {boolean} True if BottomSheet mode is enabled
 */
export const selectPredictBottomSheetEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    validatedVersionGatedFeatureFlag(
      unwrapRemoteFeatureFlag<VersionGatedFeatureFlag>(
        remoteFeatureFlags?.predictBottomSheet,
      ),
    ) ?? false,
);
