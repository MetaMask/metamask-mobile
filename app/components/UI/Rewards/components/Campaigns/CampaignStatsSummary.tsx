import React from 'react';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type {
  CampaignLeaderboardPositionDto,
  OndoGmPortfolioSummaryDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { formatPercentChange, formatUsd } from '../../utils/formatUtils';
import { formatTierDisplayName } from './OndoLeaderboard.utils';
import RewardsErrorBanner from '../RewardsErrorBanner';

const CELL_STYLE = { flex: 1 } as const;

export interface StatCellProps {
  label: string;
  value: string;
  isLoading?: boolean;
  valueColor?: TextColor;
  testID?: string;
}

export const StatCell: React.FC<StatCellProps> = ({
  label,
  value,
  isLoading = false,
  valueColor = TextColor.TextDefault,
  testID,
}) => {
  const tw = useTailwind();
  return (
    <Box style={CELL_STYLE}>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {label}
      </Text>
      {isLoading ? (
        <Skeleton style={tw.style('h-5 w-20 rounded')} />
      ) : (
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
          color={valueColor}
          testID={testID}
          twClassName="font-semibold"
        >
          {value}
        </Text>
      )}
    </Box>
  );
};

export const CAMPAIGN_STATS_SUMMARY_TEST_IDS = {
  CONTAINER: 'campaign-stats-summary-container',
  RETURN: 'campaign-stats-summary-return',
  NET_DEPOSIT: 'campaign-stats-summary-net-deposit',
  RANK: 'campaign-stats-summary-rank',
  TIER: 'campaign-stats-summary-tier',
  LEADERBOARD_ERROR: 'campaign-stats-summary-leaderboard-error',
  PORTFOLIO_ERROR: 'campaign-stats-summary-portfolio-error',
} as const;

interface DataSourceState {
  isLoading: boolean;
  hasError: boolean;
  refetch: () => void;
}

interface CampaignStatsSummaryProps {
  leaderboardPosition: CampaignLeaderboardPositionDto | null;
  portfolioSummary: OndoGmPortfolioSummaryDto | null;
  leaderboard: DataSourceState;
  portfolio: DataSourceState;
}

const CampaignStatsSummary: React.FC<CampaignStatsSummaryProps> = ({
  leaderboardPosition,
  portfolioSummary,
  leaderboard,
  portfolio,
}) => {
  const leaderboardLoading = leaderboard.isLoading && !leaderboardPosition;
  const portfolioLoading = portfolio.isLoading && !portfolioSummary;

  const leaderboardError = leaderboard.hasError && !leaderboardPosition;
  const portfolioError = portfolio.hasError && !portfolioSummary;

  const returnValue = leaderboardPosition
    ? formatPercentChange(leaderboardPosition.rateOfReturn)
    : '-';

  const netDepositValue = portfolioSummary
    ? formatUsd(portfolioSummary.netDeposit)
    : '-';

  const rankValue = leaderboardPosition ? `${leaderboardPosition.rank}` : '-';

  const tierValue = leaderboardPosition
    ? formatTierDisplayName(leaderboardPosition.projectedTier)
    : '-';

  return (
    <Box twClassName="gap-3" testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.CONTAINER}>
      <Text variant={TextVariant.HeadingMd}>Stats</Text>

      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label="Return"
          value={returnValue}
          isLoading={leaderboardLoading}
          valueColor={TextColor.SuccessDefault}
          testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.RETURN}
        />
        <StatCell
          label="Net Deposit"
          value={netDepositValue}
          isLoading={portfolioLoading}
          valueColor={TextColor.SuccessDefault}
          testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.NET_DEPOSIT}
        />
      </Box>

      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label="Rank"
          value={rankValue}
          isLoading={leaderboardLoading}
          testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.RANK}
        />
        <StatCell
          label="Tier"
          value={tierValue}
          isLoading={leaderboardLoading}
          testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.TIER}
        />
      </Box>

      {leaderboardError && (
        <RewardsErrorBanner
          title="Unable to load leaderboard stats"
          description="Something went wrong. Please try again."
          onConfirm={leaderboard.refetch}
          confirmButtonLabel="Retry"
          testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.LEADERBOARD_ERROR}
        />
      )}

      {portfolioError && (
        <RewardsErrorBanner
          title="Unable to load portfolio stats"
          description="Something went wrong. Please try again."
          onConfirm={portfolio.refetch}
          confirmButtonLabel="Retry"
          testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.PORTFOLIO_ERROR}
        />
      )}
    </Box>
  );
};

export default CampaignStatsSummary;
