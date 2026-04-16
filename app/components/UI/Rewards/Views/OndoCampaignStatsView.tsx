import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { getCampaignMechanicsButtonProps } from '../utils/campaignHeaderUtils';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import {
  StatCell,
  CAMPAIGN_STATS_SUMMARY_TEST_IDS,
} from '../components/Campaigns/CampaignStatsSummary';
import LeaderboardPositionHeader from '../components/Campaigns/LeaderboardPositionHeader';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import {
  formatTierDisplayName,
  getTierMinNetDeposit,
} from '../components/Campaigns/OndoLeaderboard.utils';
import { strings } from '../../../../../locales/i18n';
import { formatPercentChange, formatUsd } from '../utils/formatUtils';
import {
  ONDO_GM_REQUIRED_QUALIFIED_DAYS,
  isCampaignIneligible,
} from '../utils/ondoCampaignConstants';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import { useGetOndoLeaderboard } from '../hooks/useGetOndoLeaderboard';
import { useGetOndoPortfolioPosition } from '../hooks/useGetOndoPortfolioPosition';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';
import Routes from '../../../../constants/navigation/Routes';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { selectCampaignById } from '../../../../reducers/rewards/selectors';

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type OndoCampaignStatsRouteParams = {
  OndoCampaignStats: { campaignId: string };
};

export const ONDO_CAMPAIGN_STATS_VIEW_TEST_IDS = {
  CONTAINER: 'ondo-campaign-stats-view-container',
} as const;

const CheckIcon: React.FC = () => (
  <Icon
    name={IconName.Check}
    size={IconSize.Sm}
    color={IconColor.SuccessDefault}
  />
);

const OndoCampaignStatsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<OndoCampaignStatsRouteParams, 'OndoCampaignStats'>>();
  const { campaignId } = route.params;

  const selectCampaign = useMemo(
    () => selectCampaignById(campaignId),
    [campaignId],
  );

  useTrackRewardsPageView({
    page_type: 'ondo_campaign_status',
    campaign_id: campaignId,
  });

  const campaign = useSelector(selectCampaign);
  const isCampaignActive =
    campaign != null && getCampaignStatus(campaign) === 'active';

  const { status: participantStatusData } =
    useGetCampaignParticipantStatus(campaignId);
  const isOptedIn = participantStatusData?.optedIn === true;

  const {
    portfolio: portfolioData,
    isLoading: isPortfolioLoading,
    hasError: hasPortfolioError,
    refetch: refetchPortfolio,
  } = useGetOndoPortfolioPosition(isOptedIn ? campaignId : undefined);

  const {
    position: leaderboardPosition,
    isLoading: isLeaderboardPositionLoading,
    hasError: hasLeaderboardPositionError,
    refetch: refetchLeaderboardPosition,
  } = useGetOndoLeaderboardPosition(isOptedIn ? campaignId : undefined);

  useGetOndoLeaderboard(campaignId, {
    defaultTier: leaderboardPosition?.projectedTier,
  });

  const leaderboardLoading =
    isLeaderboardPositionLoading && !leaderboardPosition;
  const portfolioLoading = isPortfolioLoading && !portfolioData;

  const leaderboardError = hasLeaderboardPositionError && !leaderboardPosition;
  const portfolioError = hasPortfolioError && !portfolioData;

  const isPending =
    leaderboardPosition != null && !leaderboardPosition.qualified;
  const isQualified =
    leaderboardPosition != null && leaderboardPosition.qualified;

  const isIneligible = useMemo(
    () => isCampaignIneligible(campaign, leaderboardPosition?.qualified),
    [campaign, leaderboardPosition],
  );

  const returnValue = portfolioData?.summary
    ? formatPercentChange(portfolioData.summary.portfolioPnlPercent)
    : '-';

  const returnColor = portfolioData?.summary
    ? parseFloat(portfolioData.summary.portfolioPnlPercent) < 0
      ? TextColor.ErrorDefault
      : TextColor.SuccessDefault
    : TextColor.TextDefault;

  const marketValue = portfolioData?.summary
    ? formatUsd(portfolioData.summary.totalCurrentValue)
    : '-';

  const netInflowValue = portfolioData?.summary
    ? formatUsd(portfolioData.summary.netDeposit)
    : '-';

  const hasCashedOut = portfolioData?.summary
    ? parseFloat(portfolioData.summary.totalCashedOut) > 0
    : false;

  const outflowValue = portfolioData?.summary
    ? formatUsd(portfolioData.summary.totalCashedOut)
    : '-';

  const rankValue =
    isIneligible || !leaderboardPosition
      ? '-'
      : String(leaderboardPosition.rank).padStart(2, '0');

  const tierValue =
    isIneligible || !leaderboardPosition
      ? '-'
      : formatTierDisplayName(leaderboardPosition.projectedTier);

  const daysHeldValue = leaderboardPosition
    ? `${leaderboardPosition.qualifiedDays}/${ONDO_GM_REQUIRED_QUALIFIED_DAYS}`
    : '-';

  const tierMinDeposit = useMemo(
    () =>
      leaderboardPosition && campaign && isCampaignActive
        ? getTierMinNetDeposit(
            campaign.details?.tiers,
            leaderboardPosition.projectedTier,
          )
        : null,
    [campaign, leaderboardPosition, isCampaignActive],
  );

  const daysRemaining = leaderboardPosition
    ? Math.max(
        ONDO_GM_REQUIRED_QUALIFIED_DAYS - leaderboardPosition.qualifiedDays,
        0,
      )
    : 0;

  const showQualifyCard =
    isCampaignActive &&
    isPending &&
    !isIneligible &&
    daysRemaining > 0 &&
    tierMinDeposit != null;

  return (
    <ErrorBoundary navigation={navigation} view="OndoCampaignStatsView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={ONDO_CAMPAIGN_STATS_VIEW_TEST_IDS.CONTAINER}
      >
        <HeaderCompactStandard
          title={strings('rewards.ondo_campaign_stats.title')}
          titleProps={{ variant: TextVariant.HeadingSm }}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'ondo-campaign-stats-back-button' }}
          endButtonIconProps={getCampaignMechanicsButtonProps(
            campaign != null,
            () =>
              navigation.navigate(Routes.REWARDS_CAMPAIGN_MECHANICS, {
                campaignId,
              }),
            'campaign-stats-mechanics-button',
          )}
          includesTopInset
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
        >
          <Box twClassName="p-4">
            <LeaderboardPositionHeader
              rank={rankValue}
              tier={tierValue}
              isLoading={leaderboardLoading}
              isPending={isPending}
              isQualified={isQualified}
              isIneligible={isIneligible}
            />
          </Box>

          {/* ── Divider ── */}
          <Box twClassName="my-1 border-b border-border-muted" />
          <Box twClassName="p-4 gap-3">
            {/* ── Portfolio section ── */}
            <Text variant={TextVariant.HeadingMd}>
              {strings('rewards.ondo_campaign_stats.label_portfolio')}
            </Text>

            {/* Return | Market Value */}
            <Box flexDirection={BoxFlexDirection.Row}>
              <StatCell
                label={strings('rewards.ondo_campaign_stats.label_return')}
                value={returnValue}
                isLoading={portfolioLoading}
                valueColor={returnColor}
              />
              <StatCell
                label={strings(
                  'rewards.ondo_campaign_stats.label_market_value',
                )}
                value={marketValue}
                isLoading={portfolioLoading}
                valueColor={returnColor}
              />
            </Box>

            {/* Net inflow | Outflow (or Days held when no outflow) */}
            <Box flexDirection={BoxFlexDirection.Row}>
              <StatCell
                label={strings('rewards.ondo_campaign_stats.label_net_inflow')}
                value={netInflowValue}
                isLoading={portfolioLoading}
                suffix={isQualified ? <CheckIcon /> : undefined}
              />
              {hasCashedOut ? (
                <StatCell
                  label={strings('rewards.ondo_campaign_stats.label_outflow')}
                  value={outflowValue}
                  isLoading={portfolioLoading}
                />
              ) : (
                <StatCell
                  label={strings('rewards.ondo_campaign_stats.label_days_held')}
                  value={daysHeldValue}
                  isLoading={leaderboardLoading}
                  valueColor={TextColor.TextDefault}
                  suffix={isQualified ? <CheckIcon /> : undefined}
                />
              )}
            </Box>

            {/* Days held (when outflow row present) */}
            {hasCashedOut && (
              <Box flexDirection={BoxFlexDirection.Row}>
                <StatCell
                  label={strings('rewards.ondo_campaign_stats.label_days_held')}
                  value={daysHeldValue}
                  isLoading={leaderboardLoading}
                  valueColor={TextColor.TextDefault}
                  suffix={isQualified ? <CheckIcon /> : undefined}
                />
                <Box twClassName="flex-1" />
              </Box>
            )}

            {/* ── Qualify for rank card (static) ── */}
            {showQualifyCard && (
              <Box twClassName="bg-muted rounded-xl p-4 mt-2 gap-2">
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {strings(
                    'rewards.ondo_campaign_leaderboard.qualify_for_rank_title',
                  )}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings(
                    'rewards.ondo_campaign_leaderboard.qualify_for_rank_description',
                    {
                      minNetDeposit: formatUsd(tierMinDeposit ?? 0),
                      daysRemaining,
                    },
                  )}
                </Text>
              </Box>
            )}

            {/* ── You're qualified card ── */}
            {!isIneligible && isQualified && tierMinDeposit != null && (
              <Box twClassName="bg-muted rounded-xl p-4 mt-2 gap-2">
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {strings('rewards.ondo_campaign_stats.qualified_title')}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings(
                    'rewards.ondo_campaign_stats.qualified_description',
                    { minNetDeposit: formatUsd(tierMinDeposit) },
                  )}
                </Text>
              </Box>
            )}

            {/* ── Not eligible banner ── */}
            {isIneligible && (
              <Box
                twClassName="bg-muted rounded-xl p-4 mt-2 gap-2"
                testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.NOT_ELIGIBLE_BANNER}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {strings('rewards.ondo_campaign_stats.not_eligible_title')}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings(
                    'rewards.ondo_campaign_stats.not_eligible_description',
                    { days: ONDO_GM_REQUIRED_QUALIFIED_DAYS },
                  )}
                </Text>
              </Box>
            )}

            {/* ── Error banner ── */}
            {(leaderboardError || portfolioError) && (
              <RewardsErrorBanner
                title={strings('rewards.ondo_campaign_stats.stats_error_title')}
                description={strings(
                  'rewards.ondo_campaign_stats.stats_error_description',
                )}
                onConfirm={() => {
                  refetchLeaderboardPosition();
                  refetchPortfolio();
                }}
                confirmButtonLabel={strings(
                  'rewards.ondo_campaign_stats.retry',
                )}
              />
            )}
          </Box>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default OndoCampaignStatsView;
