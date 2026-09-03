import { TokenDetailsSource } from '../../TokenDetails/constants/constants';
import {
  EARN_MODULE_ENTRY_POINTS,
  EARN_MODULE_COMPONENT_NAMES,
  EARN_MODULE_STRATEGY_TYPES,
  EARN_MODULE_SCREEN_NAMES,
} from '../constants/earnModuleEvents';
import type { EarnAsset } from '../types/earnAssets';
import type {
  EarnModuleAnalyticsContext,
  EarnModuleAssetProperties,
} from '../types/earnModuleEvents.types';
import { formatChainIdForAnalytics } from './analytics';
import { truncateNumber } from './number';

// TODO: Simplify this. Feels like we're working against TokenDetailsSource.
export const getEarnModuleEntryPoint = (
  source: TokenDetailsSource,
  screenName?: EARN_MODULE_SCREEN_NAMES,
): EARN_MODULE_ENTRY_POINTS => {
  switch (source) {
    case TokenDetailsSource.HomeSection:
      return EARN_MODULE_ENTRY_POINTS.HOMEPAGE;
    case TokenDetailsSource.ExploreSearch:
      return EARN_MODULE_ENTRY_POINTS.EXPLORE_SEARCH;
    case TokenDetailsSource.ExploreEarn:
      if (screenName === EARN_MODULE_SCREEN_NAMES.EXPLORE_NOW_TAB) {
        return EARN_MODULE_ENTRY_POINTS.EXPLORE_NOW_TAB;
      }
      if (screenName === EARN_MODULE_SCREEN_NAMES.EXPLORE_CRYPTO_TAB) {
        return EARN_MODULE_ENTRY_POINTS.EXPLORE_CRYPTO_TAB;
      }
      return EARN_MODULE_ENTRY_POINTS.EXPLORE;
    default:
      return EARN_MODULE_ENTRY_POINTS.EXPLORE;
  }
};

export const getEarnModuleScreenName = (
  source: TokenDetailsSource,
): EARN_MODULE_SCREEN_NAMES => {
  switch (source) {
    case TokenDetailsSource.HomeSection:
      return EARN_MODULE_SCREEN_NAMES.WALLET_HOME;
    case TokenDetailsSource.ExploreNowMovers:
    case TokenDetailsSource.ExploreNowStocks:
      return EARN_MODULE_SCREEN_NAMES.EXPLORE_NOW_TAB;
    case TokenDetailsSource.ExploreCryptoTrending:
      return EARN_MODULE_SCREEN_NAMES.EXPLORE_CRYPTO_TAB;
    default:
      return EARN_MODULE_SCREEN_NAMES.EXPLORE;
  }
};

export const getEarnModuleComponentName = (
  source: TokenDetailsSource,
): EARN_MODULE_COMPONENT_NAMES => {
  switch (source) {
    case TokenDetailsSource.HomeSection:
      return EARN_MODULE_COMPONENT_NAMES.HOMEPAGE_EARN_SECTION;
    case TokenDetailsSource.ExploreSearch:
      return EARN_MODULE_COMPONENT_NAMES.EXPLORE_SEARCH_EARN_SECTION;
    default:
      return EARN_MODULE_COMPONENT_NAMES.EXPLORE_EARN_SECTION;
  }
};

export const getEarnModuleAssetProperties = (
  earnAsset: EarnAsset,
  position?: number,
  assetsInList?: number,
): EarnModuleAssetProperties => {
  const metadata =
    earnAsset.kind === 'held'
      ? {
          chainId: earnAsset.asset.chainId,
          symbol: earnAsset.asset.symbol,
          ticker: earnAsset.asset.symbol,
          name: earnAsset.asset.name,
        }
      : earnAsset.metadata;

  const earnAssetSupportsSingleExperience = earnAsset.experiences.length === 1;

  return {
    asset_symbol: metadata.ticker ?? metadata.symbol ?? metadata.name,
    chain_id: formatChainIdForAnalytics(metadata.chainId),
    ...(position === undefined ? {} : { asset_position: position }),
    ...(assetsInList === undefined ? {} : { assets_in_list: assetsInList }),
    eligible_strategy_count: earnAsset.experiences.length,
    eligible_strategy_types: earnAsset.experiences.map(
      ({ type }) => type.toLowerCase() as Lowercase<EARN_MODULE_STRATEGY_TYPES>,
    ),
    asset_has_balance:
      earnAsset.kind === 'held' && earnAsset.asset.balance !== '0',
    // Only attach rate when we know the experience being used. We don't want an ambiguous rate property.
    ...(earnAssetSupportsSingleExperience &&
    earnAsset.experiences[0]?.rate?.status === 'ready'
      ? {
          rate_percentage: Number(
            truncateNumber(earnAsset.experiences[0]?.rate.percentage),
          ),
        }
      : {}),
    // Only attach when we know the experience being used. We don't want an ambiguous is_fee_subsidized property.
    ...(earnAssetSupportsSingleExperience
      ? {
          is_fee_subsidized: earnAsset.experiences.some(
            ({ isFeeSubsidized }) => isFeeSubsidized,
          ),
        }
      : {}),
  };
};

// TODO: Rename to something better. This is unintuitive.
export const getEarnModuleAnalyticsContext = (
  source: TokenDetailsSource,
  position?: number,
  assetsInList?: number,
  screenName?: EARN_MODULE_SCREEN_NAMES,
): EarnModuleAnalyticsContext => ({
  entry_point: getEarnModuleEntryPoint(source, screenName),
  ...(screenName ? { screen_name: screenName } : {}),
  ...(position === undefined ? {} : { asset_position: position }),
  ...(assetsInList === undefined ? {} : { assets_in_list: assetsInList }),
});
