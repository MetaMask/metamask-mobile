import React, { useMemo } from 'react';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { PerpsTradingCampaignLeaderboardDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { StatCell } from './OndoCampaignStatsSummary';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { strings } from '../../../../../../locales/i18n';
import { formatCompactUsd, formatSignedUsd } from '../../utils/formatUtils';

const PERPS_WINNERS_CAP = 20;

export const PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS = {
  CONTAINER: 'perps-campaign-ended-stats-container',
  TOTAL_PARTICIPANTS: 'perps-campaign-ended-stats-total-participants',
  TOTAL_VOLUME: 'perps-campaign-ended-stats-total-volume',
  TOP_PNL: 'perps-campaign-ended-stats-top-pnl',
  WINNERS: 'perps-campaign-ended-stats-winners',
} as const;

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
    const hasFullLeaderboard = entries.length >= PERPS_WINNERS_CAP;
    return { totalParticipants, topPnl, hasFullLeaderboard };
  }, [leaderboard]);

  const isLeaderboardSkeletonVisible = isLeaderboardLoading && !leaderboard;
  const isVolumeSkeletonVisible = isVolumeLoading && !totalNotionalVolume;

  const hasError =
    (hasLeaderboardError && !leaderboard) ||
    (hasVolumeError && !totalNotionalVolume);

  const totalParticipantsValue = stats
    ? stats.totalParticipants.toLocaleString()
    : '-';

  const totalVolumeValue = totalNotionalVolume
    ? formatCompactUsd(parseFloat(totalNotionalVolume))
    : '-';

  const topPnlValue =
    stats?.topPnl != null ? formatSignedUsd(stats.topPnl) : '-';

  const topPnlColor =
    stats?.topPnl != null && stats.topPnl >= 0
      ? TextColor.SuccessDefault
      : TextColor.ErrorDefault;

  const winnersValue = stats?.hasFullLeaderboard
    ? String(PERPS_WINNERS_CAP)
    : '-';

  return (
    <Box
      twClassName="gap-3"
      testID={PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.CONTAINER}
    >
      <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
        {strings('rewards.perps_trading_campaign.stats_title')}
      </Text>
      {hasError && (
        <RewardsErrorBanner
          title={strings('rewards.perps_trading_campaign.stats_error_title')}
          description={strings(
            'rewards.perps_trading_campaign.stats_error_description',
          )}
          onConfirm={() => {
            onRetryLeaderboard?.();
            onRetryVolume?.();
          }}
          confirmButtonLabel={strings(
            'rewards.perps_trading_campaign.stats_retry',
          )}
        />
      )}
      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label={strings(
            'rewards.perps_trading_campaign.completed_label_total_participants',
          )}
          value={totalParticipantsValue}
          isLoading={isLeaderboardSkeletonVisible}
          testID={PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_PARTICIPANTS}
        />
        <StatCell
          label={strings(
            'rewards.perps_trading_campaign.completed_label_total_volume',
          )}
          value={totalVolumeValue}
          isLoading={isVolumeSkeletonVisible}
          testID={PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_VOLUME}
        />
      </Box>
      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label={strings(
            'rewards.perps_trading_campaign.completed_label_top_pnl',
          )}
          value={topPnlValue}
          isLoading={isLeaderboardSkeletonVisible}
          valueColor={
            stats?.topPnl != null ? topPnlColor : TextColor.TextDefault
          }
          testID={PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.TOP_PNL}
        />
        <StatCell
          label={strings(
            'rewards.perps_trading_campaign.completed_label_winners',
          )}
          value={winnersValue}
          isLoading={isLeaderboardSkeletonVisible}
          testID={PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.WINNERS}
        />
      </Box>
    </Box>
  );
};

export default PerpsTradingCampaignEndedStats;
