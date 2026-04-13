import React, { useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import {
  StatCell,
  PendingTag,
  QualifiedTag,
} from '../components/Campaigns/CampaignStatsSummary';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { formatTierDisplayName } from '../components/Campaigns/OndoLeaderboard.utils';
import { strings } from '../../../../../locales/i18n';
import { formatPercentChange, formatUsd } from '../utils/formatUtils';
import { ONDO_GM_REQUIRED_QUALIFIED_DAYS } from '../utils/ondoCampaignConstants';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import { useGetOndoLeaderboard } from '../hooks/useGetOndoLeaderboard';
import { useGetOndoPortfolioPosition } from '../hooks/useGetOndoPortfolioPosition';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';
import Routes from '../../../../constants/navigation/Routes';

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

  const { campaigns } = useRewardCampaigns();
  const campaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId],
  );
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

  const { leaderboard: leaderboardData } = useGetOndoLeaderboard(campaignId, {
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

  const isNegativeReturn = (leaderboardPosition?.rateOfReturn ?? 0) < 0;

  const returnValue = leaderboardPosition
    ? formatPercentChange(leaderboardPosition.rateOfReturn)
    : '-';

  const returnColor = isNegativeReturn
    ? TextColor.ErrorDefault
    : TextColor.SuccessDefault;

  const marketValue = portfolioData?.summary
    ? formatUsd(portfolioData.summary.totalCurrentValue)
    : '-';

  const netDepositedValue = portfolioData?.summary
    ? formatUsd(portfolioData.summary.netDeposit)
    : '-';

  const cashedOutValue = portfolioData?.summary
    ? formatUsd(portfolioData.summary.totalCashedOut)
    : '-';

  const rankValue = leaderboardPosition ? `${leaderboardPosition.rank}` : '-';

  const tierValue = leaderboardPosition
    ? formatTierDisplayName(leaderboardPosition.projectedTier)
    : '-';

  const netDepositValue = leaderboardPosition
    ? formatUsd(leaderboardPosition.netDeposit)
    : '-';

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
      leaderboardPosition && leaderboardData && isCampaignActive
        ? (leaderboardData.tiers[leaderboardPosition.projectedTier]
            ?.minDeposit ?? null)
        : null,
    [leaderboardData, leaderboardPosition, isCampaignActive],
  );

  const showQualifyCard =
    isCampaignActive &&
    isPending &&
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

              {leaderboardLoading ? (
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

            {isNegativeReturn ? (
              <>
                <Box flexDirection={BoxFlexDirection.Row}>
                  <StatCell
                    label={strings(
                      'rewards.ondo_campaign_stats.label_market_value',
                    )}
                    value={marketValue}
                    isLoading={portfolioLoading}
                    valueColor={TextColor.ErrorDefault}
                  />
                  <StatCell
                    label={strings(
                      'rewards.ondo_campaign_stats.label_net_deposited',
                    )}
                    value={netDepositedValue}
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
                  valueColor={TextColor.SuccessDefault}
                />
                <Box twClassName="flex-1" />
              </Box>
            )}

            {/* ── Divider ── */}
            <Box twClassName="my-5 border-b border-border-muted" />

            {/* ── Rank section heading ── */}
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-2"
            >
              <Text variant={TextVariant.HeadingMd}>
                {strings('rewards.ondo_campaign_stats.label_your_rank')}
              </Text>
              {isPending && <PendingTag />}
              {isQualified && <QualifiedTag />}
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
                isLoading={leaderboardLoading}
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
                    netDeposit: leaderboardPosition.netDeposit,
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
                        minDeposit: formatUsd(tierMinDeposit ?? 0),
                        daysRemaining,
                      },
                    )}
                  </Text>
                </Box>
              </Pressable>
            )}

            {/* ── You're qualified card ── */}
            {isQualified && tierMinDeposit != null && (
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
                    { minDeposit: formatUsd(tierMinDeposit) },
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
