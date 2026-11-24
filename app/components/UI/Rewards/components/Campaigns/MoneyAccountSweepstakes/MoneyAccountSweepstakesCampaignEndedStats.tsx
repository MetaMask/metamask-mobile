import React, { useCallback } from 'react';
import { TextColor } from '@metamask/design-system-react-native';
import type {
  MoneyAccountSweepstakesPrizePoolDto,
  MoneyAccountSweepstakesVolumeStatsDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../../locales/i18n';
import { formatCompactUsd } from '../../../utils/formatUtils';
import CampaignEndedStats from '../CampaignEndedStats';

interface MoneyAccountSweepstakesCampaignEndedStatsProps {
  volumeStats: MoneyAccountSweepstakesVolumeStatsDto | null;
  prizePool: MoneyAccountSweepstakesPrizePoolDto | null;
  isVolumeStatsLoading: boolean;
  isPrizePoolLoading: boolean;
  hasVolumeStatsError?: boolean;
  hasPrizePoolError?: boolean;
  onRetryVolumeStats?: () => void;
  onRetryPrizePool?: () => void;
}

const MoneyAccountSweepstakesCampaignEndedStats: React.FC<
  MoneyAccountSweepstakesCampaignEndedStatsProps
> = ({
  volumeStats,
  prizePool,
  isVolumeStatsLoading,
  isPrizePoolLoading,
  hasVolumeStatsError,
  hasPrizePoolError,
  onRetryVolumeStats,
  onRetryPrizePool,
}) => {
  const hasVolumeStats = volumeStats != null;
  const hasPrizePool = prizePool != null;
  const hasTotalVolume = volumeStats?.totalVolumeUsd != null;
  const isVolumeStatsStatsLoading = isVolumeStatsLoading && !hasVolumeStats;
  const isTotalVolumeLoading = isVolumeStatsLoading && !hasTotalVolume;
  const isPrizePoolStatsLoading = isPrizePoolLoading && !hasPrizePool;
  const hasError =
    (hasVolumeStatsError && !hasVolumeStats) ||
    (hasPrizePoolError && !hasPrizePool);

  const retry = useCallback(() => {
    onRetryVolumeStats?.();
    onRetryPrizePool?.();
  }, [onRetryPrizePool, onRetryVolumeStats]);

  const yieldColor =
    volumeStats?.yieldEarnedUsd != null && volumeStats.yieldEarnedUsd >= 0
      ? TextColor.SuccessDefault
      : TextColor.ErrorDefault;

  return (
    <CampaignEndedStats
      totalParticipants={{
        label: strings('rewards.campaign_ended_stats.total_participants'),
        value: volumeStats
          ? volumeStats.eligibleParticipantCount.toLocaleString()
          : '-',
        isLoading: isVolumeStatsStatsLoading,
      }}
      totalVolume={{
        label: strings('rewards.campaign_ended_stats.total_volume'),
        value:
          volumeStats?.totalVolumeUsd != null
            ? formatCompactUsd(volumeStats.totalVolumeUsd)
            : '-',
        isLoading: isTotalVolumeLoading,
      }}
      topMetric={{
        label: strings('rewards.campaign_ended_stats.total_yield'),
        value:
          volumeStats?.yieldEarnedUsd != null
            ? formatCompactUsd(volumeStats.yieldEarnedUsd, {
                maximumFractionDigits: 2,
              })
            : '-',
        valueColor:
          volumeStats?.yieldEarnedUsd != null
            ? yieldColor
            : TextColor.TextDefault,
        isLoading: isVolumeStatsStatsLoading,
      }}
      totalWinners={{
        label: strings('rewards.campaign_ended_stats.total_winners'),
        value: prizePool ? String(prizePool.numberOfWinners) : '-',
        isLoading: isPrizePoolStatsLoading,
      }}
      hasError={hasError}
      onRetry={retry}
    />
  );
};

export default MoneyAccountSweepstakesCampaignEndedStats;
