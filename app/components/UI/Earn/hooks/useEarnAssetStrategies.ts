import { useMemo } from 'react';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { EarnStrategyRiskLevel } from '../components/EarnStrategyCard';
import type { EarnAssetId, EarnExperience } from '../types/earnAssets';
import { truncateNumber } from '../utils';
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

type StrategyKind = 'money' | 'lending' | 'pooled_staking' | 'trx_staking';

const infoRowsKeyByStrategyKind: Record<StrategyKind, string> = {
  money: 'money_account',
  lending: 'lending',
  pooled_staking: 'pooled_staking',
  trx_staking: 'trx_staking',
};

const getStrategyKind = (experience: EarnExperience): StrategyKind => {
  if (experience.type === 'MONEY_ACCOUNT_DEPOSIT') return 'money';
  if (experience.type === EARN_EXPERIENCES.STABLECOIN_LENDING) {
    return 'lending';
  }
  if (experience.type === EARN_EXPERIENCES.TRX_STAKING) return 'trx_staking';
  return 'pooled_staking';
};

const riskByStrategyKind: Record<StrategyKind, EarnStrategyRiskLevel> = {
  money: EarnStrategyRiskLevel.Recommended,
  lending: EarnStrategyRiskLevel.Medium,
  pooled_staking: EarnStrategyRiskLevel.Low,
  trx_staking: EarnStrategyRiskLevel.Low,
};

const infoIcons = [IconName.Chart, IconName.Lock, IconName.SecurityTick];

const getStrategy = (
  experience: EarnExperience,
  assetLabel: string,
  moneyApyPercent?: number,
): EarnAssetStrategy => {
  const strategyKind = getStrategyKind(experience);
  const infoRowsKey = infoRowsKeyByStrategyKind[strategyKind];
  const percentage = experience.rate.percentage;
  const title =
    percentage === undefined
      ? strings('earn_module.rate_unavailable')
      : strings(
          experience.rate.type === 'APY'
            ? 'earn_module.rate_apy'
            : 'earn_module.rate_apr',
          { percentage: truncateNumber(percentage) },
        );

  return {
    id: experience.id,
    experience,
    risk: riskByStrategyKind[strategyKind],
    title,
    subtitle: strings(
      `earn.strategy_selection.strategies.${strategyKind}.subtitle`,
      { asset: assetLabel },
    ),
    tertiaryText: strings(
      `earn.strategy_selection.strategies.${strategyKind}.tertiary_text`,
    ),
    infoRows: infoIcons.flatMap((icon, index) => {
      const rowNumber = index + 1;
      const isMoneyApyRow = strategyKind === 'money' && rowNumber === 1;
      const rowKey = `earn.strategy_selection.info_rows.${infoRowsKey}.row_${rowNumber}`;
      const text = isMoneyApyRow
        ? moneyApyPercent === undefined
          ? undefined
          : strings(rowKey, {
              percentage: truncateNumber(moneyApyPercent),
            })
        : strings(rowKey);

      if (text === undefined) return [];

      return [{ id: `${experience.id}:${rowNumber}`, icon, text }];
    }),
  };
};

const useEarnAssetStrategies = (assetId: EarnAssetId) => {
  const { assetsById, isLoading, hasError, errors, refresh, moneyApyPercent } =
    useEarnAssetCatalogue();
  const asset = assetsById[assetId.toLowerCase()];
  const strategies = useMemo(() => {
    if (!asset) return [];
    const assetLabel = asset.ticker ?? asset.symbol ?? asset.name ?? '';
    return asset.experiences.map((experience) =>
      getStrategy(experience, assetLabel, moneyApyPercent),
    );
  }, [asset, moneyApyPercent]);

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
