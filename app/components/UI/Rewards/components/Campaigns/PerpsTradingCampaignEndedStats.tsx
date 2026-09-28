import React, { useCallback, useMemo } from 'react';
import { TextColor } from '@metamask/design-system-react-native';
import type {
  PerpsTradingCampaignLeaderboardDto,
  PerpsTradingCampaignPrizePoolDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import { formatCompactUsd, formatSignedUsd } from '../../utils/formatUtils';
import { PERPS_TRADING_MAX_WINNERS } from '../../utils/perpsCampaignConstants';
import CampaignEndedStats from './CampaignEndedStats';

interface PerpsTradingCampaignEndedStatsProps {
  leaderboard: PerpsTradingCampaignLeaderboardDto | null;
  prizePool: PerpsTradingCampaignPrizePoolDto | null;
  isLeaderboardLoading: boolean;
  isPrizePoolLoading: boolean;
  hasLeaderboardError?: boolean;
  hasPrizePoolError?: boolean;
  onRetryLeaderboard?: () => void;
  onRetryPrizePool?: () => void;
}

const PerpsTradingCampaignEndedStats: React.FC<
  PerpsTradingCampaignEndedStatsProps
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

    const entries = leaderboard.entries ?? [];
    const totalParticipants = leaderboard.totalParticipants;
    const topPnl =
      entries.length > 0 ? Math.max(...entries.map((e) => e.pnl)) : null;
    const numberOfWinners =
      leaderboard.numberOfWinners ?? PERPS_TRADING_MAX_WINNERS;
    const hasFullLeaderboard = entries.length >= numberOfWinners;
    return { totalParticipants, topPnl, numberOfWinners, hasFullLeaderboard };
  }, [leaderboard]);

  const hasStats = stats != null;
  const hasPrizePool = prizePool != null;
  const hasTotalVolume = prizePool?.totalVolumeUsd != null;
  const isStatsLoading = isLeaderboardLoading && !hasStats;
  const isTotalVolumeLoading = isPrizePoolLoading && !hasTotalVolume;
  const hasError =
    (hasLeaderboardError && !hasStats) || (hasPrizePoolError && !hasPrizePool);

  const retry = useCallback(() => {
    onRetryLeaderboard?.();
    onRetryPrizePool?.();
  }, [onRetryLeaderboard, onRetryPrizePool]);

  const topPnlColor =
    stats?.topPnl != null && stats.topPnl >= 0
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
        label: strings('rewards.campaign_ended_stats.top_pnl'),
        value: stats?.topPnl != null ? formatSignedUsd(stats.topPnl) : '-',
        valueColor: stats?.topPnl != null ? topPnlColor : TextColor.TextDefault,
        isLoading: isStatsLoading,
      }}
      totalWinners={{
        label: strings('rewards.campaign_ended_stats.total_winners'),
        value: stats?.hasFullLeaderboard ? String(stats.numberOfWinners) : '-',
        isLoading: isStatsLoading,
      }}
      hasError={hasError}
      onRetry={retry}
    />
  );
};

export default PerpsTradingCampaignEndedStats;
