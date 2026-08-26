import { strings } from '../../../../../../locales/i18n';
import { truncateNumber } from '../../utils';
import { isEarnAssetBalanceBelowMinDepositAmount } from '../earnAssets/earnAssetBalance';
import type { EarnSectionRankedAsset } from './rankEarnSectionAssets';

export const getEarnAssetRateText = ({
  asset,
}: {
  asset: EarnSectionRankedAsset;
}): string => {
  const hasMinDepositAmount = !isEarnAssetBalanceBelowMinDepositAmount(asset);

  if (asset.highestRatePercent === undefined) {
    return strings('earn_module.rate_unavailable');
  }

  const isApr = asset.highestRateExperience?.rate.type === 'APR';
  const key = hasMinDepositAmount
    ? isApr
      ? 'earn_module.get_rate_apr'
      : 'earn_module.get_rate_apy'
    : isApr
      ? 'earn_module.rate_apr'
      : 'earn_module.rate_apy';

  return strings(key, {
    percentage: truncateNumber(asset.highestRatePercent),
  });
};
