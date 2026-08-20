import { strings } from '../../../../../../locales/i18n';
import { truncateNumber } from '../../utils';
import type { EarnSectionRankedAsset } from './rankEarnSectionAssets';

export const getEarnAssetRateText = ({
  asset,
  useGetCopy,
}: {
  asset: EarnSectionRankedAsset;
  useGetCopy: boolean;
}): string => {
  if (asset.highestRatePercent === undefined) {
    return strings('earn_module.rate_unavailable');
  }

  const isApr = asset.highestRateExperience?.rate.type === 'APR';
  const key = useGetCopy
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
