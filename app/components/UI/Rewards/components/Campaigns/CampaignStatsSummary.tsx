import React from 'react';
import {
  Box,
  BoxAlignItems,
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
import { strings } from '../../../../../../locales/i18n';
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
  suffix?: React.ReactNode;
}

export const StatCell: React.FC<StatCellProps> = ({
  label,
  value,
  isLoading = false,
  valueColor = TextColor.TextDefault,
  testID,
  suffix,
}) => {
  const tw = useTailwind();
  return (
    <Box style={CELL_STYLE}>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {label}
      </Text>
      {isLoading ? (
        <Skeleton style={tw.style('h-5 w-20 rounded')} />
      ) : (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            color={valueColor}
            testID={testID}
            twClassName="font-semibold"
          >
            {value}
          </Text>
          {suffix}
        </Box>
      )}
    </Box>
  );
};

export const CAMPAIGN_STATS_SUMMARY_TEST_IDS = {
  CONTAINER: 'campaign-stats-summary-container',
  RETURN: 'campaign-stats-summary-return',
  MARKET_VALUE: 'campaign-stats-summary-market-value',
  RANK: 'campaign-stats-summary-rank',
  TIER: 'campaign-stats-summary-tier',
  PENDING_TAG: 'campaign-stats-summary-pending-tag',
  LEADERBOARD_ERROR: 'campaign-stats-summary-leaderboard-error',
  PORTFOLIO_ERROR: 'campaign-stats-summary-portfolio-error',
} as const;

export const PendingTag: React.FC<{ testID?: string }> = ({ testID }) => (
  <Box twClassName="bg-muted rounded-[6px] px-1" testID={testID}>
    <Text
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
    >
      {strings('rewards.ondo_campaign_leaderboard.pending')}
    </Text>
  </Box>
);

export const QualifiedTag: React.FC<{ testID?: string }> = ({ testID }) => (
  <Box twClassName="bg-success-muted rounded-[6px] px-1" testID={testID}>
    <Text
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Medium}
      color={TextColor.SuccessDefault}
    >
      {strings('rewards.ondo_campaign_leaderboard.qualified')}
    </Text>
  </Box>
);

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

  const isPending =
    leaderboardPosition != null && !leaderboardPosition.qualified;
  const isQualified =
    leaderboardPosition != null && leaderboardPosition.qualified;

  const returnValue = leaderboardPosition
    ? formatPercentChange(leaderboardPosition.rateOfReturn)
    : '-';

  const marketValue = portfolioSummary
    ? formatUsd(portfolioSummary.totalCurrentValue)
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
          label="Market Value"
          value={marketValue}
          isLoading={portfolioLoading}
          valueColor={TextColor.SuccessDefault}
          testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.MARKET_VALUE}
        />
      </Box>

      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label="Rank"
          value={rankValue}
          isLoading={leaderboardLoading}
          testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.RANK}
          suffix={
            isPending ? (
              <PendingTag
                testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.PENDING_TAG}
              />
            ) : undefined
          }
        />
        <StatCell
          label="Tier"
          value={tierValue}
          isLoading={leaderboardLoading}
          testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.TIER}
          suffix={
            isPending ? (
              <PendingTag
                testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.PENDING_TAG}
              />
            ) : isQualified ? (
              <QualifiedTag
                testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.PENDING_TAG}
              />
            ) : undefined
          }
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
