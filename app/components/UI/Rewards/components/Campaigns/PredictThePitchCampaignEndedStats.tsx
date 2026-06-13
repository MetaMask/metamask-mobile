import React, { useCallback, useMemo } from 'react';
import { TextColor } from '@metamask/design-system-react-native';
import type {
  PredictThePitchLeaderboardDto,
  PredictThePitchPrizePoolDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import { formatCompactUsd, formatPercentChange } from '../../utils/formatUtils';
import CampaignEndedStats from './CampaignEndedStats';

interface PredictThePitchCampaignEndedStatsProps {
  leaderboard: PredictThePitchLeaderboardDto | null;
  prizePool: PredictThePitchPrizePoolDto | null;
  isLeaderboardLoading: boolean;
  isPrizePoolLoading: boolean;
  hasLeaderboardError?: boolean;
  hasPrizePoolError?: boolean;
  onRetryLeaderboard?: () => void;
  onRetryPrizePool?: () => void;
}

const PredictThePitchCampaignEndedStats: React.FC<
  PredictThePitchCampaignEndedStatsProps
> = ({
  leaderboard,
  prizePool,
  isLeaderboardLoading,
  isPrizePoolLoading,
  hasLeaderboardError,
  hasPrizePoolError,
  onRetryLeaderboard,
  onRetryPrizePool,
}) => {
  const stats = useMemo(() => {
    if (!leaderboard) return null;

    const topRoi =
      leaderboard.entries.length > 0
        ? Math.max(...leaderboard.entries.map((entry) => entry.roi))
        : null;

    return {
      totalParticipants: leaderboard.totalParticipants,
      topRoi,
    };
  }, [leaderboard]);

  const hasStats = stats != null;
  const hasPrizePool = prizePool != null;
  const hasTotalVolume = prizePool?.totalVolumeUsd != null;
  const isStatsLoading = isLeaderboardLoading && !hasStats;
  const isPrizePoolStatsLoading = isPrizePoolLoading && !hasPrizePool;
  const isTotalVolumeLoading = isPrizePoolLoading && !hasTotalVolume;
  const hasError =
    (hasLeaderboardError && !hasStats) || (hasPrizePoolError && !hasPrizePool);

  const retry = useCallback(() => {
    onRetryLeaderboard?.();
    onRetryPrizePool?.();
  }, [onRetryLeaderboard, onRetryPrizePool]);

  const topRoiColor =
    stats?.topRoi != null && stats.topRoi >= 0
      ? TextColor.SuccessDefault
      : TextColor.ErrorDefault;

  return (
    <CampaignEndedStats
      totalParticipants={{
        label: strings('rewards.campaign_ended_stats.total_participants'),
        value: stats ? stats.totalParticipants.toLocaleString() : '-',
        isLoading: isStatsLoading,
      }}
      totalVolume={{
        label: strings('rewards.campaign_ended_stats.total_volume'),
        value:
          prizePool?.totalVolumeUsd != null
            ? formatCompactUsd(prizePool.totalVolumeUsd)
            : '-',
        isLoading: isTotalVolumeLoading,
      }}
      topMetric={{
        label: strings('rewards.campaign_ended_stats.top_return'),
        value: stats?.topRoi != null ? formatPercentChange(stats.topRoi) : '-',
        valueColor: stats?.topRoi != null ? topRoiColor : TextColor.TextDefault,
        isLoading: isStatsLoading,
      }}
      totalWinners={{
        label: strings('rewards.campaign_ended_stats.total_winners'),
        value: prizePool ? String(prizePool.breakdown.length) : '-',
        isLoading: isPrizePoolStatsLoading,
      }}
      hasError={hasError}
      onRetry={retry}
    />
  );
};

export default PredictThePitchCampaignEndedStats;
