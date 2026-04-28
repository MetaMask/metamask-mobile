import React from 'react';
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
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-1.5"
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {label}
        </Text>
        {!isLoading && suffix}
      </Box>
      {isLoading ? (
        <Skeleton style={tw.style('h-5 w-20 rounded')} />
      ) : (
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={valueColor}
          testID={testID}
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
  MARKET_VALUE: 'campaign-stats-summary-market-value',
  RANK: 'campaign-stats-summary-rank',
  TIER: 'campaign-stats-summary-tier',
  PENDING_TAG: 'campaign-stats-summary-pending-tag',
  QUALIFIED_TAG: 'campaign-stats-summary-qualified-tag',
  INELIGIBLE_TAG: 'campaign-stats-summary-ineligible-tag',
  NOT_ELIGIBLE_BANNER: 'campaign-stats-summary-not-eligible-banner',
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

export const IneligibleTag: React.FC<{ testID?: string }> = ({ testID }) => (
  <Box twClassName="bg-warning-muted rounded-[6px] px-1.5" testID={testID}>
    <Text
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Medium}
      color={TextColor.WarningDefault}
    >
      {strings('rewards.ondo_campaign_leaderboard.ineligible')}
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
  /** Minimum deposit (USD) for the user's projected tier — enables the "Qualify for this rank" card */
  tierMinDeposit?: number | null;
  /** User joined too late to ever accumulate enough qualifying days */
  isIneligible?: boolean;
}

const CampaignStatsSummary: React.FC<CampaignStatsSummaryProps> = ({
  leaderboardPosition,
  portfolioSummary,
  leaderboard,
  portfolio,
  tierMinDeposit,
  isIneligible = false,
}) => {
  const leaderboardLoading = leaderboard.isLoading && !leaderboardPosition;
  const portfolioLoading = portfolio.isLoading && !portfolioSummary;

  const leaderboardError = leaderboard.hasError && !leaderboardPosition;
  const portfolioError = portfolio.hasError && !portfolioSummary;

  const isPending =
    leaderboardPosition != null && !leaderboardPosition.qualified;
  const isQualified =
    leaderboardPosition != null && leaderboardPosition.qualified;

  const returnValue = portfolioSummary
    ? formatPercentChange(portfolioSummary.portfolioPnlPercent)
    : '-';

  const returnColor = portfolioSummary
    ? parseFloat(portfolioSummary.portfolioPnlPercent) < 0
      ? TextColor.ErrorDefault
      : TextColor.SuccessDefault
    : TextColor.TextDefault;

  const marketValue = portfolioSummary
    ? formatUsd(portfolioSummary.totalCurrentValue)
    : '-';

  const rankValue =
    isIneligible || !leaderboardPosition
      ? '-'
      : String(leaderboardPosition.rank).padStart(2, '0');

  const tierValue =
    isIneligible || !leaderboardPosition
      ? '-'
      : formatTierDisplayName(leaderboardPosition.projectedTier);

  return (
    <Box twClassName="gap-3" testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.CONTAINER}>
      {/* Rank | Tier */}
      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label={strings('rewards.ondo_campaign_stats.label_rank')}
          value={rankValue}
          isLoading={leaderboardLoading}
          testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.RANK}
          suffix={
            isIneligible ? (
              <IneligibleTag
                testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.INELIGIBLE_TAG}
              />
            ) : isPending ? (
              <PendingTag
                testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.PENDING_TAG}
              />
            ) : isQualified ? (
              <Icon
                name={IconName.Check}
                size={IconSize.Sm}
                color={IconColor.SuccessDefault}
                testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.QUALIFIED_TAG}
              />
            ) : undefined
          }
        />
        <StatCell
          label={strings('rewards.ondo_campaign_stats.label_tier')}
          value={tierValue}
          isLoading={leaderboardLoading}
          testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.TIER}
        />
      </Box>

      {/* Return | Market Value */}
      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label={strings('rewards.ondo_campaign_stats.label_return')}
          value={returnValue}
          isLoading={portfolioLoading}
          valueColor={returnColor}
          testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.RETURN}
        />
        <StatCell
          label={strings('rewards.ondo_campaign_stats.label_market_value')}
          value={marketValue}
          isLoading={portfolioLoading}
          valueColor={returnColor}
          testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.MARKET_VALUE}
        />
      </Box>

      {/* You're qualified card */}
      {!isIneligible && isQualified && tierMinDeposit != null && (
        <Box twClassName="bg-muted rounded-xl p-4 mt-2 gap-2">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('rewards.ondo_campaign_stats.qualified_title')}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('rewards.ondo_campaign_stats.qualified_description', {
              minNetDeposit: formatUsd(tierMinDeposit),
            })}
          </Text>
        </Box>
      )}

      {/* Not eligible banner */}
      {isIneligible && (
        <Box
          twClassName="bg-muted rounded-xl p-4 mt-2 gap-2"
          testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.NOT_ELIGIBLE_BANNER}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('rewards.ondo_campaign_stats.not_eligible_title')}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('rewards.ondo_campaign_stats.not_eligible_description', {
              days: ONDO_GM_REQUIRED_QUALIFIED_DAYS,
            })}
          </Text>
        </Box>
      )}

      {/* Qualify for rank card */}
      {!isIneligible &&
        isPending &&
        tierMinDeposit != null &&
        leaderboardPosition &&
        Math.max(
          ONDO_GM_REQUIRED_QUALIFIED_DAYS - leaderboardPosition.qualifiedDays,
          0,
        ) > 0 && (
          <Box twClassName="bg-muted rounded-xl p-4 mt-2 gap-2">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
            >
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings(
                  'rewards.ondo_campaign_leaderboard.qualify_for_rank_title',
                )}
              </Text>
            </Box>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings(
                'rewards.ondo_campaign_leaderboard.qualify_for_rank_description',
                {
                  minNetDeposit: formatUsd(tierMinDeposit),
                  daysRemaining: Math.max(
                    ONDO_GM_REQUIRED_QUALIFIED_DAYS -
                      leaderboardPosition.qualifiedDays,
                    1,
                  ),
                },
              )}
            </Text>
          </Box>
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
