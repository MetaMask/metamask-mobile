import { useMemo } from 'react';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { EarnStrategyRiskLevel } from '../components/EarnStrategyCard';
import type {
  EarnAssetId,
  EarnExperience,
  EarnExperienceType,
} from '../types/earnAssets';
import { truncateNumber } from '../utils';
import { getEarnAssetMetadata } from '../utils/earnAssets';
import useEarnAssetCatalogue from './useEarnAssetCatalogue';

export interface EarnStrategyInfo {
  id: string;
  icon: IconName;
  text: string;
}

export interface EarnAssetStrategy {
  id: string;
  experience: EarnExperience;
  risk: EarnStrategyRiskLevel;
  title: string;
  subtitle: string;
  tertiaryText: string;
  infoRows: EarnStrategyInfo[];
}

interface StrategyPresentation {
  strategyKey: string;
  infoRowsKey: string;
  risk: EarnStrategyRiskLevel;
}

const strategyPresentationByExperienceType: Record<
  EarnExperienceType,
  StrategyPresentation
> = {
  MONEY_ACCOUNT_DEPOSIT: {
    strategyKey: 'money',
    infoRowsKey: 'money_account',
    risk: EarnStrategyRiskLevel.Recommended,
  },
  [EARN_EXPERIENCES.STABLECOIN_LENDING]: {
    strategyKey: 'lending',
    infoRowsKey: 'lending',
    risk: EarnStrategyRiskLevel.Medium,
  },
  [EARN_EXPERIENCES.POOLED_STAKING]: {
    strategyKey: 'pooled_staking',
    infoRowsKey: 'pooled_staking',
    risk: EarnStrategyRiskLevel.Low,
  },
  [EARN_EXPERIENCES.TRX_STAKING]: {
    strategyKey: 'trx_staking',
    infoRowsKey: 'trx_staking',
    risk: EarnStrategyRiskLevel.Low,
  },
};

const infoIcons = [IconName.Chart, IconName.Lock, IconName.SecurityTick];

/**
 * Builds the display model for one Earn strategy.
 *
 * @param experience - Earn experience containing rate and product details.
 * @param assetLabel - User-facing label for the underlying asset.
 * @returns Strategy card and information-row content.
 */
const getStrategy = (
  experience: EarnExperience,
  assetLabel: string,
): EarnAssetStrategy => {
  const { strategyKey, infoRowsKey, risk } =
    strategyPresentationByExperienceType[experience.type];
  const percentage = experience.rate.percentage;
  let title: string;
  if (percentage === undefined) {
    title = strings('earn_module.rate_unavailable');
  } else if (experience.rate.type === 'APY') {
    title = strings('earn_module.rate_apy', {
      percentage: truncateNumber(percentage),
    });
  } else {
    title = strings('earn_module.rate_apr', {
      percentage: truncateNumber(percentage),
    });
  }

  return {
    id: experience.id,
    experience,
    risk,
    title,
    subtitle: strings(
      `earn.strategy_selection.strategies.${strategyKey}.subtitle`,
      { asset: assetLabel },
    ),
    tertiaryText: strings(
      `earn.strategy_selection.strategies.${strategyKey}.tertiary_text`,
    ),
    infoRows: infoIcons.flatMap((icon, index) => {
      const rowNumber = index + 1;
      const rowKey = `earn.strategy_selection.info_rows.${infoRowsKey}.row_${rowNumber}`;
      const isMoneyAccountFirstRow =
        infoRowsKey === 'money_account' && rowNumber === 1;
      const textKey =
        percentage === undefined && isMoneyAccountFirstRow
          ? `${rowKey}_unavailable`
          : rowKey;
      return [
        {
          id: `${experience.id}:${rowNumber}`,
          icon,
          text:
            percentage === undefined
              ? strings(textKey)
              : strings(textKey, { percentage: truncateNumber(percentage) }),
        },
      ];
    }),
  };
};

const useEarnAssetStrategies = (assetId: EarnAssetId) => {
  const { assetsById, isLoading, hasError, errors, refresh } =
    useEarnAssetCatalogue();
  const asset = assetsById[assetId.toLowerCase()];
  const strategies = useMemo(() => {
    if (!asset) return [];
    const metadata = getEarnAssetMetadata(asset);
    const assetLabel =
      metadata.ticker ?? metadata.symbol ?? metadata.name ?? '';
    return asset.experiences.map((experience) =>
      getStrategy(experience, assetLabel),
    );
  }, [asset]);

  return useMemo(
    () => ({
      asset,
      strategies,
      isLoading,
      hasError,
      errors,
      refresh,
    }),
    [asset, errors, hasError, isLoading, refresh, strategies],
  );
};

export default useEarnAssetStrategies;
