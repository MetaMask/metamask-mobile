import React, { useCallback, useMemo } from 'react';
import { TextColor } from '@metamask/design-system-react-native';
import type { CampaignLeaderboardDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import { formatCompactUsd, formatPercentChange } from '../../utils/formatUtils';
import CampaignEndedStats from './CampaignEndedStats';

interface OndoCampaignEndedStatsProps {
  leaderboard: CampaignLeaderboardDto | null;
  totalUsdDeposited: string | number | null;
  isLeaderboardLoading: boolean;
  isDepositsLoading: boolean;
  hasLeaderboardError?: boolean;
  hasDepositsError?: boolean;
  onRetryLeaderboard?: () => void;
  onRetryDeposits?: () => void;
}

const OndoCampaignEndedStats: React.FC<OndoCampaignEndedStatsProps> = ({
  leaderboard,
  totalUsdDeposited,
  isLeaderboardLoading,
  isDepositsLoading,
  hasLeaderboardError,
  hasDepositsError,
  onRetryLeaderboard,
  onRetryDeposits,
}) => {
  const stats = useMemo(() => {
    if (!leaderboard) return null;

    const tiers = Object.values(leaderboard.tiers);
    const totalParticipants = tiers.reduce(
      (sum, tier) => sum + tier.totalParticipants,
      0,
    );
    const entries = tiers.flatMap((tier) => tier.entries);
    const topReturn =
      entries.length > 0
        ? Math.max(...entries.map((entry) => entry.rateOfReturn))
        : null;
    const totalWinners = tiers.reduce(
      (sum, tier) =>
        sum +
        Math.min(5, tier.entries.filter((entry) => entry.qualified).length),
      0,
    );

    return { totalParticipants, topReturn, totalWinners };
  }, [leaderboard]);

  const hasStats = stats != null;
  const hasTotalVolume = totalUsdDeposited != null;
  const isStatsLoading = isLeaderboardLoading && !hasStats;
  const isTotalVolumeLoading = isDepositsLoading && !hasTotalVolume;
  const hasError =
    (hasLeaderboardError && !hasStats) || (hasDepositsError && !hasTotalVolume);

  const retry = useCallback(() => {
    onRetryLeaderboard?.();
    onRetryDeposits?.();
  }, [onRetryDeposits, onRetryLeaderboard]);

  const topReturnColor =
    stats?.topReturn != null && stats.topReturn >= 0
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
          totalUsdDeposited != null
            ? formatCompactUsd(
                typeof totalUsdDeposited === 'number'
                  ? totalUsdDeposited
                  : Number.parseFloat(totalUsdDeposited),
              )
            : '-',
        isLoading: isTotalVolumeLoading,
      }}
      topMetric={{
        label: strings('rewards.campaign_ended_stats.top_return'),
        value:
          stats?.topReturn != null ? formatPercentChange(stats.topReturn) : '-',
        valueColor:
          stats?.topReturn != null ? topReturnColor : TextColor.TextDefault,
        isLoading: isStatsLoading,
      }}
      totalWinners={{
        label: strings('rewards.campaign_ended_stats.total_winners'),
        value: stats ? String(stats.totalWinners) : '-',
        isLoading: isStatsLoading,
      }}
      hasError={hasError}
      onRetry={retry}
    />
  );
};

export default OndoCampaignEndedStats;
