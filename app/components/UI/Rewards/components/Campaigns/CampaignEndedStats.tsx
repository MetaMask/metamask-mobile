import React, { useMemo } from 'react';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { CampaignLeaderboardDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { StatCell } from './OndoCampaignStatsSummary';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { strings } from '../../../../../../locales/i18n';
import { formatCompactUsd, formatPercentChange } from '../../utils/formatUtils';

export const CAMPAIGN_ENDED_STATS_TEST_IDS = {
  CONTAINER: 'campaign-ended-stats-container',
  TOTAL_PARTICIPANTS: 'campaign-ended-stats-total-participants',
  TOTAL_TVL: 'campaign-ended-stats-total-tvl',
  TOP_RETURN: 'campaign-ended-stats-top-return',
  WINNERS: 'campaign-ended-stats-winners',
} as const;

interface CampaignEndedStatsProps {
  leaderboard: CampaignLeaderboardDto | null;
  totalUsdDeposited: string | null;
  isLeaderboardLoading: boolean;
  isDepositsLoading: boolean;
  hasLeaderboardError?: boolean;
  hasDepositsError?: boolean;
  onRetryLeaderboard?: () => void;
  onRetryDeposits?: () => void;
}

const CampaignEndedStats: React.FC<CampaignEndedStatsProps> = ({
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
    const allEntries = tiers.flatMap((tier) => tier.entries);
    const topReturn =
      allEntries.length > 0
        ? Math.max(...allEntries.map((e) => e.rateOfReturn))
        : null;
    const winners = tiers.reduce(
      (sum, tier) =>
        sum + Math.min(5, tier.entries.filter((e) => e.qualified).length),
      0,
    );

    return { totalParticipants, topReturn, winners };
  }, [leaderboard]);

  const isLeaderboardSkeletonVisible = isLeaderboardLoading && !leaderboard;
  const isDepositsSkeletonVisible = isDepositsLoading && !totalUsdDeposited;

  const hasError =
    (hasLeaderboardError && !leaderboard) ||
    (hasDepositsError && !totalUsdDeposited);

  const totalParticipantsValue = stats
    ? stats.totalParticipants.toLocaleString()
    : '-';

  const totalTvlValue = totalUsdDeposited
    ? formatCompactUsd(parseFloat(totalUsdDeposited))
    : '-';

  const topReturnValue =
    stats?.topReturn != null ? formatPercentChange(stats.topReturn) : '-';

  const topReturnColor =
    stats?.topReturn != null && stats.topReturn >= 0
      ? TextColor.SuccessDefault
      : TextColor.ErrorDefault;

  const winnersValue = stats ? String(stats.winners) : '-';

  return (
    <Box twClassName="gap-3" testID={CAMPAIGN_ENDED_STATS_TEST_IDS.CONTAINER}>
      <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
        {strings('rewards.ondo_campaign_stats.title')}
      </Text>
      {hasError && (
        <RewardsErrorBanner
          title={strings('rewards.ondo_campaign_stats.stats_error_title')}
          description={strings(
            'rewards.ondo_campaign_stats.stats_error_description',
          )}
          onConfirm={() => {
            onRetryLeaderboard?.();
            onRetryDeposits?.();
          }}
          confirmButtonLabel={strings('rewards.ondo_campaign_stats.retry')}
        />
      )}
      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label={strings(
            'rewards.ondo_campaign_stats.completed_label_total_participants',
          )}
          value={totalParticipantsValue}
          isLoading={isLeaderboardSkeletonVisible}
          testID={CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_PARTICIPANTS}
        />
        <StatCell
          label={strings(
            'rewards.ondo_campaign_stats.completed_label_total_tvl',
          )}
          value={totalTvlValue}
          isLoading={isDepositsSkeletonVisible}
          testID={CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_TVL}
        />
      </Box>
      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label={strings(
            'rewards.ondo_campaign_stats.completed_label_top_return',
          )}
          value={topReturnValue}
          isLoading={isLeaderboardSkeletonVisible}
          valueColor={
            stats?.topReturn != null ? topReturnColor : TextColor.TextDefault
          }
          testID={CAMPAIGN_ENDED_STATS_TEST_IDS.TOP_RETURN}
        />
        <StatCell
          label={strings('rewards.ondo_campaign_stats.completed_label_winners')}
          value={winnersValue}
          isLoading={isLeaderboardSkeletonVisible}
          testID={CAMPAIGN_ENDED_STATS_TEST_IDS.WINNERS}
        />
      </Box>
    </Box>
  );
};

export default CampaignEndedStats;
