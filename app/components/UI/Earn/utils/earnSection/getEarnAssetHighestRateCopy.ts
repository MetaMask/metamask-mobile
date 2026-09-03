import { strings } from '../../../../../../locales/i18n';
import { truncateNumber } from '../../utils';
import { isEarnAssetBalanceBelowMinDepositAmount } from '../earnAssets/earnAssetBalance';
import type { EarnSectionRankedAsset } from './rankEarnSectionAssets';

/**
 * Gets localized highest-rate copy for a ranked Earn asset.
 *
 * @param asset - Ranked Earn asset whose highest-rate copy should be generated.
 * @returns Localized rate copy, including unavailable or get-started copy.
 */
export const getEarnAssetHighestRateCopy = ({
  asset,
}: {
  asset: EarnSectionRankedAsset;
}): string => {
  const hasMinDepositAmount = !isEarnAssetBalanceBelowMinDepositAmount(asset);

  if (asset.highestRatePercent === undefined) {
    return strings('earn_module.rate_unavailable');
  }

  const isApr = asset.highestRateExperience?.rate.type === 'APR';
  let key = 'earn_module.rate_apy';

  if (isApr) {
    key = 'earn_module.rate_apr';
  }

  if (hasMinDepositAmount) {
    key = 'earn_module.get_rate_apy';
  }

  if (hasMinDepositAmount && isApr) {
    key = 'earn_module.get_rate_apr';
  }

  return strings(key, {
    percentage: truncateNumber(asset.highestRatePercent),
  });
};
