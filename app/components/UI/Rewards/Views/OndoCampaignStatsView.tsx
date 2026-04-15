import React, { useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Skeleton,
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
  PendingTag,
  QualifiedTag,
  IneligibleTag,
  CAMPAIGN_STATS_SUMMARY_TEST_IDS,
} from '../components/Campaigns/CampaignStatsSummary';
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

  const isNegativeReturn = portfolioData?.summary
    ? parseFloat(portfolioData.summary.portfolioPnlPercent) < 0
    : false;

  const returnValue = portfolioData?.summary
    ? formatPercentChange(portfolioData.summary.portfolioPnlPercent)
    : '-';

  const returnColor = isNegativeReturn
    ? TextColor.ErrorDefault
    : TextColor.SuccessDefault;

  const marketValue = portfolioData?.summary
    ? formatUsd(portfolioData.summary.totalCurrentValue)
    : '-';

  const netDepositValue = portfolioData?.summary
    ? formatUsd(portfolioData.summary.netDeposit)
    : '-';

  const hasCashedOut = portfolioData?.summary
    ? parseFloat(portfolioData.summary.totalCashedOut) > 0
    : false;

  const cashedOutValue = portfolioData?.summary
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

  const daysRemaining = leaderboardPosition
    ? Math.max(
        ONDO_GM_REQUIRED_QUALIFIED_DAYS - leaderboardPosition.qualifiedDays,
        0,
      )
    : 0;

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
          <Box twClassName="p-4 gap-3">
            {/* ── Top section: return + market values ── */}
            <Box>
              <Text variant={TextVariant.HeadingMd}>
                {strings('rewards.ondo_campaign_stats.label_your_return')}
              </Text>

              {portfolioLoading ? (
                <Skeleton style={tw.style('h-9 w-28 rounded')} />
              ) : (
                <Text
                  variant={TextVariant.DisplayLg}
                  fontWeight={FontWeight.Bold}
                  color={returnColor}
                >
                  {returnValue}
                </Text>
              )}
            </Box>

            {hasCashedOut ? (
              <>
                <Box flexDirection={BoxFlexDirection.Row}>
                  <StatCell
                    label={strings(
                      'rewards.ondo_campaign_stats.label_market_value',
                    )}
                    value={marketValue}
                    isLoading={portfolioLoading}
                    valueColor={returnColor}
                  />
                  <StatCell
                    label={strings(
                      'rewards.ondo_campaign_stats.label_net_deposited',
                    )}
                    value={netDepositValue}
                    isLoading={portfolioLoading}
                  />
                </Box>
                <Box flexDirection={BoxFlexDirection.Row}>
                  <StatCell
                    label={strings(
                      'rewards.ondo_campaign_stats.label_cashed_out',
                    )}
                    value={cashedOutValue}
                    isLoading={portfolioLoading}
                  />
                  <Box twClassName="flex-1" />
                </Box>
              </>
            ) : (
              <Box flexDirection={BoxFlexDirection.Row}>
                <StatCell
                  label={strings(
                    'rewards.ondo_campaign_stats.label_market_value',
                  )}
                  value={marketValue}
                  isLoading={portfolioLoading}
                  valueColor={returnColor}
                />
                <Box twClassName="flex-1" />
              </Box>
            )}

            {/* ── Divider ── */}
            <Box twClassName="my-1 border-b border-border-muted" />

            {/* ── Rank section heading ── */}
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-2"
            >
              <Text variant={TextVariant.HeadingMd}>
                {strings('rewards.ondo_campaign_stats.label_your_rank')}
              </Text>
              {isIneligible && (
                <IneligibleTag
                  testID={CAMPAIGN_STATS_SUMMARY_TEST_IDS.INELIGIBLE_TAG}
                />
              )}
              {!isIneligible && isPending && <PendingTag />}
              {!isIneligible && isQualified && <QualifiedTag />}
            </Box>

            {/* Rank | Tier */}
            <Box flexDirection={BoxFlexDirection.Row}>
              <StatCell
                label={strings('rewards.ondo_campaign_stats.label_rank')}
                value={rankValue}
                isLoading={leaderboardLoading}
              />
              <StatCell
                label={strings('rewards.ondo_campaign_stats.label_tier')}
                value={tierValue}
                isLoading={leaderboardLoading}
              />
            </Box>

            {/* Net deposit | Days held */}
            <Box flexDirection={BoxFlexDirection.Row}>
              <StatCell
                label={strings('rewards.ondo_campaign_stats.label_net_deposit')}
                value={netDepositValue}
                isLoading={portfolioLoading}
                suffix={isQualified ? <CheckIcon /> : undefined}
              />
              <StatCell
                label={strings('rewards.ondo_campaign_stats.label_days_held')}
                value={daysHeldValue}
                isLoading={leaderboardLoading}
                valueColor={
                  leaderboardPosition &&
                  leaderboardPosition.qualifiedDays <
                    ONDO_GM_REQUIRED_QUALIFIED_DAYS
                    ? TextColor.WarningDefault
                    : TextColor.TextDefault
                }
                suffix={isQualified ? <CheckIcon /> : undefined}
              />
            </Box>

            {/* ── Qualify for this rank card ── */}
            {showQualifyCard && (
              <Pressable
                onPress={() => {
                  if (!leaderboardPosition || tierMinDeposit == null) return;
                  navigation.navigate(Routes.MODAL.REWARDS_ONDO_PENDING_SHEET, {
                    variant: 'own',
                    tier: leaderboardPosition.projectedTier,
                    netDeposit: parseFloat(
                      portfolioData?.summary?.netDeposit ?? '0',
                    ),
                    qualifiedDays: leaderboardPosition.qualifiedDays,
                    tierMinDeposit,
                  });
                }}
              >
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
                        minNetDeposit: formatUsd(tierMinDeposit ?? 0),
                        daysRemaining,
                      },
                    )}
                  </Text>
                </Box>
              </Pressable>
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
