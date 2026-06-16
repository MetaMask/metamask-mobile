import React, { useCallback, useMemo } from 'react';
import { TextColor } from '@metamask/design-system-react-native';
import type { PerpsTradingCampaignLeaderboardDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import { formatCompactUsd, formatSignedUsd } from '../../utils/formatUtils';
import { PERPS_TRADING_MAX_WINNERS } from '../../utils/perpsCampaignConstants';
import CampaignEndedStats from './CampaignEndedStats';

interface PerpsTradingCampaignEndedStatsProps {
  leaderboard: PerpsTradingCampaignLeaderboardDto | null;
  totalNotionalVolume: string | null;
  isLeaderboardLoading: boolean;
  isVolumeLoading: boolean;
  hasLeaderboardError?: boolean;
  hasVolumeError?: boolean;
  onRetryLeaderboard?: () => void;
  onRetryVolume?: () => void;
}

const PerpsTradingCampaignEndedStats: React.FC<
  PerpsTradingCampaignEndedStatsProps
> = ({
  leaderboard,
  totalNotionalVolume,
  isLeaderboardLoading,
  isVolumeLoading,
  hasLeaderboardError,
  hasVolumeError,
  onRetryLeaderboard,
  onRetryVolume,
}) => {
  const stats = useMemo(() => {
    if (!leaderboard) return null;

    const entries = leaderboard.entries ?? [];
    const totalParticipants = leaderboard.totalParticipants;
    const topPnl =
      entries.length > 0 ? Math.max(...entries.map((e) => e.pnl)) : null;
    const hasFullLeaderboard = entries.length >= PERPS_TRADING_MAX_WINNERS;
    return { totalParticipants, topPnl, hasFullLeaderboard };
  }, [leaderboard]);

  const hasStats = stats != null;
  const hasTotalVolume = totalNotionalVolume != null;
  const isStatsLoading = isLeaderboardLoading && !hasStats;
  const isTotalVolumeLoading = isVolumeLoading && !hasTotalVolume;
  const hasError =
    (hasLeaderboardError && !hasStats) || (hasVolumeError && !hasTotalVolume);

  const retry = useCallback(() => {
    onRetryLeaderboard?.();
    onRetryVolume?.();
  }, [onRetryLeaderboard, onRetryVolume]);

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
        value: totalNotionalVolume
          ? formatCompactUsd(parseFloat(totalNotionalVolume))
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
        value: stats?.hasFullLeaderboard
          ? String(PERPS_TRADING_MAX_WINNERS)
          : '-',
        isLoading: isStatsLoading,
      }}
      hasError={hasError}
      onRetry={retry}
    />
  );
};

export default PerpsTradingCampaignEndedStats;
