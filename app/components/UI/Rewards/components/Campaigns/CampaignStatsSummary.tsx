import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
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
import { ONDO_GM_REQUIRED_QUALIFIED_DAYS } from '../../utils/ondoCampaignConstants';
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
    <Box style={CELL_STYLE} twClassName="gap-0.5">
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
            fontWeight={FontWeight.Medium}
            color={valueColor}
            testID={testID}
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
  STATS_ERROR: 'campaign-stats-summary-stats-error',
} as const;

export const PendingTag: React.FC<{ testID?: string }> = ({ testID }) => (
  <Box twClassName="bg-muted rounded-[6px] px-1.5" testID={testID}>
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
  <Box twClassName="bg-success-muted rounded-[6px] px-1.5" testID={testID}>
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
  showHeader?: boolean;
  /** Minimum deposit (USD) for the user's projected tier — enables the "Qualify for this rank" card */
  tierMinDeposit?: number | null;
  /** Called when the user taps the "Qualify for this rank" card arrow */
  onQualifyPress?: () => void;
}

const CampaignStatsSummary: React.FC<CampaignStatsSummaryProps> = ({
  leaderboardPosition,
  portfolioSummary,
  leaderboard,
  portfolio,
  showHeader = true,
  tierMinDeposit,
  onQualifyPress,
}) => {
  const leaderboardLoading = leaderboard.isLoading && !leaderboardPosition;
  const portfolioLoading = portfolio.isLoading && !portfolioSummary;

  const leaderboardError = leaderboard.hasError && !leaderboardPosition;
  const portfolioError = portfolio.hasError && !portfolioSummary;

  const isPending =
    leaderboardPosition != null && !leaderboardPosition.qualified;
  const isQualified =
    leaderboardPosition != null && leaderboardPosition.qualified;

  const isNegativeReturn = (leaderboardPosition?.rateOfReturn ?? 0) < 0;

  const returnValue = leaderboardPosition
    ? formatPercentChange(leaderboardPosition.rateOfReturn)
    : '-';

  const returnColor = isNegativeReturn
    ? TextColor.ErrorDefault
    : TextColor.SuccessDefault;

  const marketValueColor: TextColor | undefined = portfolioSummary
    ? parseFloat(portfolioSummary.portfolioPnl) < 0
      ? TextColor.ErrorDefault
      : TextColor.SuccessDefault
    : undefined;

  const marketValue = portfolioSummary
    ? formatUsd(portfolioSummary.totalCurrentValue)
    : '-';

  const rankValue = leaderboardPosition ? `${leaderboardPosition.rank}` : '-';

  const tierValue = leaderboardPosition
    ? formatTierDisplayName(leaderboardPosition.projectedTier)
    : '-';

  return (
    <Box twClassName="gap-3" testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.CONTAINER}>
      {showHeader && (
        <Text variant={TextVariant.HeadingMd}>
          {strings('rewards.ondo_campaign_stats.title')}
        </Text>
      )}

      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label={strings('rewards.ondo_campaign_stats.label_return')}
          value={returnValue}
          isLoading={leaderboardLoading}
          valueColor={returnColor}
          testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.RETURN}
        />
        <StatCell
          label={strings('rewards.ondo_campaign_stats.label_market_value')}
          value={marketValue}
          isLoading={portfolioLoading}
          valueColor={marketValueColor}
          testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.MARKET_VALUE}
        />
      </Box>

      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label={strings('rewards.ondo_campaign_stats.label_rank')}
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
          label={strings('rewards.ondo_campaign_stats.label_tier')}
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

      {isPending &&
        tierMinDeposit != null &&
        leaderboardPosition &&
        Math.max(
          ONDO_GM_REQUIRED_QUALIFIED_DAYS - leaderboardPosition.qualifiedDays,
          0,
        ) > 0 && (
          <Pressable onPress={onQualifyPress}>
            <Box twClassName="bg-muted rounded-xl p-4 mt-2 gap-2">
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={2}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {strings(
                    'rewards.ondo_campaign_leaderboard.qualify_for_rank_title',
                  )}
                </Text>
                <Icon
                  name={IconName.ArrowRight}
                  size={IconSize.Sm}
                  color={IconColor.IconAlternative}
                />
              </Box>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings(
                  'rewards.ondo_campaign_leaderboard.qualify_for_rank_description',
                  {
                    minDeposit: formatUsd(tierMinDeposit),
                    daysRemaining: Math.max(
                      ONDO_GM_REQUIRED_QUALIFIED_DAYS -
                        leaderboardPosition.qualifiedDays,
                      1,
                    ),
                  },
                )}
              </Text>
            </Box>
          </Pressable>
        )}

      {(leaderboardError || portfolioError) && (
        <RewardsErrorBanner
          title={strings('rewards.ondo_campaign_stats.stats_error_title')}
          description={strings(
            'rewards.ondo_campaign_stats.stats_error_description',
          )}
          onConfirm={() => {
            leaderboard.refetch();
            portfolio.refetch();
          }}
          confirmButtonLabel={strings('rewards.ondo_campaign_stats.retry')}
          testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.STATS_ERROR}
        />
      )}
    </Box>
  );
};

export default CampaignStatsSummary;
