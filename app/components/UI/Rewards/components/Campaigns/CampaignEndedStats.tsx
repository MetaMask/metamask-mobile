import React from 'react';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { StatCell, type StatCellProps } from './OndoCampaignStatsSummary';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { strings } from '../../../../../../locales/i18n';

export const CAMPAIGN_ENDED_STATS_TEST_IDS = {
  CONTAINER: 'campaign-ended-stats-container',
  TOTAL_PARTICIPANTS: 'campaign-ended-stats-total-participants',
  TOTAL_TVL: 'campaign-ended-stats-total-tvl',
  TOP_RETURN: 'campaign-ended-stats-top-return',
  WINNERS: 'campaign-ended-stats-winners',
} as const;

type CampaignEndedStatCell = Pick<
  StatCellProps,
  'label' | 'value' | 'isLoading' | 'valueColor'
>;

interface CampaignEndedStatsProps {
  totalParticipants: CampaignEndedStatCell;
  totalVolume: CampaignEndedStatCell;
  topMetric: CampaignEndedStatCell;
  totalWinners: CampaignEndedStatCell;
  hasError?: boolean;
  onRetry?: () => void;
}

const CampaignEndedStats: React.FC<CampaignEndedStatsProps> = ({
  totalParticipants,
  totalVolume,
  topMetric,
  totalWinners,
  hasError,
  onRetry,
}) => (
  <Box twClassName="gap-3" testID={CAMPAIGN_ENDED_STATS_TEST_IDS.CONTAINER}>
    <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
      {strings('rewards.campaign_ended_stats.title')}
    </Text>
    {hasError && (
      <RewardsErrorBanner
        title={strings('rewards.campaign_ended_stats.error_title')}
        description={strings('rewards.campaign_ended_stats.error_description')}
        onConfirm={onRetry}
        confirmButtonLabel={strings('rewards.campaign_ended_stats.retry')}
      />
    )}
    <Box flexDirection={BoxFlexDirection.Row}>
      <StatCell
        label={totalParticipants.label}
        value={totalParticipants.value}
        isLoading={totalParticipants.isLoading}
        testID={CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_PARTICIPANTS}
      />
      <StatCell
        label={totalVolume.label}
        value={totalVolume.value}
        isLoading={totalVolume.isLoading}
        testID={CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_TVL}
      />
    </Box>
    <Box flexDirection={BoxFlexDirection.Row}>
      <StatCell
        label={topMetric.label}
        value={topMetric.value}
        isLoading={topMetric.isLoading}
        valueColor={topMetric.valueColor ?? TextColor.TextDefault}
        testID={CAMPAIGN_ENDED_STATS_TEST_IDS.TOP_RETURN}
      />
      <StatCell
        label={totalWinners.label}
        value={totalWinners.value}
        isLoading={totalWinners.isLoading}
        testID={CAMPAIGN_ENDED_STATS_TEST_IDS.WINNERS}
      />
    </Box>
  </Box>
);

export default CampaignEndedStats;
