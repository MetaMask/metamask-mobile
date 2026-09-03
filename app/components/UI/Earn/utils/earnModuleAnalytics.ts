import { EARN_MODULE_STRATEGY_TYPES } from '../constants/earnModuleEvents';
import type { EarnAsset } from '../types/earnAssets';
import type {
  EarnModuleNavigationContext,
  EarnModuleAssetProperties,
  EarnModuleEventLocation,
} from '../types/earnModuleEvents.types';
import { formatChainIdForAnalytics } from './analytics';
import { truncateNumber } from './number';

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

export const buildEarnModuleNavigationContext = (
  location: Pick<EarnModuleEventLocation, 'entry_point' | 'screen_name'>,
  position?: number,
  assetsInList?: number,
): EarnModuleNavigationContext => ({
  entry_point: location.entry_point,
  ...(location.screen_name !== undefined
    ? { screen_name: location.screen_name }
    : {}),
  ...(position === undefined ? {} : { asset_position: position }),
  ...(assetsInList === undefined ? {} : { assets_in_list: assetsInList }),
});
