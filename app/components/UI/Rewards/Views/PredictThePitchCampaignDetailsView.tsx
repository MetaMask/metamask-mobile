import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  HeaderStandard,
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
import ErrorBoundary from '../../../Views/ErrorBoundary';
import CampaignHowItWorks from '../components/Campaigns/CampaignHowItWorks';
import CampaignStatus from '../components/Campaigns/CampaignStatus';
import PredictThePitchCampaignCTA from '../components/Campaigns/PredictThePitchCampaignCTA';
import PredictThePitchCampaignEndedStats from '../components/Campaigns/PredictThePitchCampaignEndedStats';
import PredictThePitchLeaderboard, {
  PREDICT_THE_PITCH_LEADERBOARD_TEST_IDS,
} from '../components/Campaigns/PredictThePitchLeaderboard';
import PredictThePitchPortfolio from '../components/Campaigns/PredictThePitchPortfolio';
import PredictThePitchPrizePool from '../components/Campaigns/PredictThePitchPrizePool';
import PredictThePitchStatsSummary from '../components/Campaigns/PredictThePitchStatsSummary';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useGetPredictThePitchLeaderboard } from '../hooks/useGetPredictThePitchLeaderboard';
import { useGetPredictThePitchLeaderboardPosition } from '../hooks/useGetPredictThePitchLeaderboardPosition';
import { useGetPredictThePitchOutcome } from '../hooks/useGetPredictThePitchOutcome';
import { useGetPredictThePitchPositions } from '../hooks/useGetPredictThePitchPositions';
import { useGetPredictThePitchPrizePool } from '../hooks/useGetPredictThePitchPrizePool';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { getCampaignMechanicsButtonProps } from '../utils/campaignHeaderUtils';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  CampaignType,
  type CampaignHowItWorks as CampaignHowItWorksData,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { selectReferralCode } from '../../../../reducers/rewards/selectors';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type PredictThePitchCampaignDetailsRouteParams = {
  RewardsPredictThePitchCampaignDetails: { campaignId?: string };
};

export const PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW_TEST_IDS = {
  CONTAINER: 'predict-the-pitch-campaign-details-view-container',
  HOW_IT_WORKS: 'predict-the-pitch-campaign-details-how-it-works',
} as const;

const sessionWinningViewAutoNavCampaignIds = new Set<string>();
export function resetPredictThePitchCampaignDetailsSessionAutoNavigationForTests(): void {
  sessionWinningViewAutoNavCampaignIds.clear();
}

const PredictThePitchCampaignDetailsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<
      RouteProp<
        PredictThePitchCampaignDetailsRouteParams,
        'RewardsPredictThePitchCampaignDetails'
      >
    >();
  const routeCampaignId = route.params?.campaignId;
  const referralCode = useSelector(selectReferralCode);

  const {
    campaigns,
    isLoading: isCampaignsLoading,
    hasError: hasCampaignsError,
    fetchCampaigns,
  } = useRewardCampaigns();

  const campaign = useMemo(
    () =>
      campaigns.find((c) =>
        routeCampaignId
          ? c.id === routeCampaignId
          : c.type === CampaignType.PREDICT_THE_PITCH,
      ) ?? null,
    [campaigns, routeCampaignId],
  );

  const effectiveCampaignId = routeCampaignId ?? campaign?.id ?? '';
  const campaignStatus = campaign ? getCampaignStatus(campaign) : null;
  const isActive = campaignStatus === 'active';
  const isComplete = campaignStatus === 'complete';

  const {
    status: participantStatusData,
    isLoading: isParticipantStatusLoading,
  } = useGetCampaignParticipantStatus(effectiveCampaignId || undefined);

  const isOptedIn = participantStatusData?.optedIn === true;

  const {
    positions,
    isLoading: isPositionsLoading,
    hasError: hasPositionsError,
    refetch: refetchPositions,
  } = useGetPredictThePitchPositions(
    isOptedIn ? effectiveCampaignId || undefined : undefined,
  );

  const hasPosition = Boolean(positions?.positions.length);

  const {
    position: leaderboardPosition,
    isLoading: isLeaderboardPositionLoading,
    hasError: hasLeaderboardPositionError,
    refetch: refetchLeaderboardPosition,
  } = useGetPredictThePitchLeaderboardPosition(
    isOptedIn ? effectiveCampaignId || undefined : undefined,
  );

  const {
    leaderboard,
    isLoading: isLeaderboardLoading,
    hasError: hasLeaderboardError,
    isLeaderboardNotYetComputed,
    refetch: refetchLeaderboard,
  } = useGetPredictThePitchLeaderboard(effectiveCampaignId || undefined);

  const {
    prizePool,
    isLoading: isPrizePoolLoading,
    hasError: hasPrizePoolError,
    refetch: refetchPrizePool,
  } = useGetPredictThePitchPrizePool(effectiveCampaignId || undefined);

  const { outcome: participantOutcome } = useGetPredictThePitchOutcome(
    isComplete && isOptedIn ? effectiveCampaignId || undefined : undefined,
  );

  useTrackRewardsPageView({
    page_type: 'predict_the_pitch_campaign_details',
    campaign_id: effectiveCampaignId || undefined,
  });

  const leaderboardUserPosition = useMemo(
    () =>
      leaderboardPosition?.rank
        ? {
            rank: leaderboardPosition.rank,
            neighbors: leaderboardPosition.neighbors ?? [],
          }
        : null,
    [leaderboardPosition],
  );

  const {
    showHowItWorksSection,
    showStatsSummarySection,
    showPrizePoolSection,
    showLeaderboardSection,
    showPortfolioSection,
    showCampaignEndedStats,
  } = useMemo(() => {
    if (!campaign) {
      return {
        showHowItWorksSection: false,
        showStatsSummarySection: false,
        showPrizePoolSection: false,
        showLeaderboardSection: false,
        showPortfolioSection: false,
        showCampaignEndedStats: false,
      };
    }

    const showEndedStats =
      isComplete && !isParticipantStatusLoading && (!isOptedIn || !hasPosition);

    return {
      showHowItWorksSection:
        Boolean(campaign.details?.howItWorks) && !hasPosition && isActive,
      showStatsSummarySection: hasPosition,
      showPrizePoolSection: isActive || isComplete,
      showLeaderboardSection: true,
      showPortfolioSection: isOptedIn && hasPosition && !isComplete,
      showCampaignEndedStats: showEndedStats,
    };
  }, [
    campaign,
    hasPosition,
    isActive,
    isComplete,
    isOptedIn,
    isParticipantStatusLoading,
  ]);

  const navigateToMechanics = useCallback(() => {
    if (!effectiveCampaignId) return;
    navigation.navigate(Routes.REWARDS_CAMPAIGN_MECHANICS, {
      campaignId: effectiveCampaignId,
    });
  }, [effectiveCampaignId, navigation]);

  const navigateToPortfolio = useCallback(() => {
    if (!effectiveCampaignId) return;
    navigation.navigate(
      Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_PORTFOLIO_VIEW,
      {
        campaignId: effectiveCampaignId,
      },
    );
  }, [effectiveCampaignId, navigation]);

  const navigateToLeaderboard = useCallback(() => {
    if (!effectiveCampaignId) return;
    navigation.navigate(Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_LEADERBOARD, {
      campaignId: effectiveCampaignId,
    });
  }, [effectiveCampaignId, navigation]);

  const navigateToWinningView = useCallback(() => {
    if (!effectiveCampaignId) return;
    navigation.navigate(
      Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_WINNING_VIEW,
      {
        campaignId: effectiveCampaignId,
        campaignName: campaign?.name ?? '',
      },
    );
  }, [campaign, effectiveCampaignId, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (
        !sessionWinningViewAutoNavCampaignIds.has(effectiveCampaignId) &&
        campaign &&
        isComplete &&
        participantOutcome?.winnerVerificationCode &&
        participantOutcome?.outcomeStatus === 'pending' &&
        effectiveCampaignId
      ) {
        sessionWinningViewAutoNavCampaignIds.add(effectiveCampaignId);
        navigateToWinningView();
      }
    }, [
      campaign,
      effectiveCampaignId,
      isComplete,
      navigateToWinningView,
      participantOutcome,
    ]),
  );

  const totalParticipants = leaderboard?.totalParticipants ?? 0;

  return (
    <ErrorBoundary
      navigation={navigation}
      view="PredictThePitchCampaignDetailsView"
    >
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW_TEST_IDS.CONTAINER}
      >
        <HeaderStandard
          title={
            campaign?.name ??
            strings('rewards.predict_the_pitch_campaign.title')
          }
          titleProps={{ variant: TextVariant.HeadingSm }}
          onBack={() => navigation.goBack()}
          backButtonProps={{
            testID: 'predict-the-pitch-campaign-details-back-button',
          }}
          endButtonIconProps={getCampaignMechanicsButtonProps(
            campaign != null,
            navigateToMechanics,
            'predict-the-pitch-campaign-details-mechanics-button',
          )}
          includesTopInset
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
        >
          {isCampaignsLoading && !campaign && (
            <Box twClassName="px-4 pt-4 gap-4">
              <Skeleton style={tw.style('h-48 rounded-xl')} />
              <Skeleton style={tw.style('h-32 rounded-xl')} />
            </Box>
          )}

          {!isCampaignsLoading && hasCampaignsError && !campaign && (
            <Box twClassName="px-4 pt-4">
              <RewardsErrorBanner
                title={strings('rewards.campaigns_view.error_title')}
                description={strings(
                  'rewards.campaigns_view.error_description',
                )}
                onConfirm={fetchCampaigns}
                confirmButtonLabel={strings(
                  'rewards.campaigns_view.retry_button',
                )}
              />
            </Box>
          )}

          {campaign && (
            <>
              <CampaignStatus campaign={campaign} optedIn={isOptedIn} />

              {showHowItWorksSection && (
                <Box
                  twClassName="p-4"
                  testID={
                    PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW_TEST_IDS.HOW_IT_WORKS
                  }
                >
                  <CampaignHowItWorks
                    howItWorks={
                      campaign.details?.howItWorks as CampaignHowItWorksData
                    }
                  />
                </Box>
              )}

              {showCampaignEndedStats && (
                <Box twClassName="p-4">
                  <PredictThePitchCampaignEndedStats
                    leaderboard={leaderboard}
                    prizePool={prizePool}
                    isLeaderboardLoading={isLeaderboardLoading}
                    isPrizePoolLoading={isPrizePoolLoading}
                    hasLeaderboardError={hasLeaderboardError}
                    hasPrizePoolError={hasPrizePoolError}
                    onRetryLeaderboard={refetchLeaderboard}
                    onRetryPrizePool={refetchPrizePool}
                  />
                </Box>
              )}

              {showStatsSummarySection && (
                <Box twClassName="p-4">
                  <Text
                    variant={TextVariant.HeadingMd}
                    fontWeight={FontWeight.Bold}
                    twClassName="mb-3"
                  >
                    {strings('rewards.predict_the_pitch_campaign.stats_title')}
                  </Text>
                  <PredictThePitchStatsSummary
                    leaderboardPosition={leaderboardPosition}
                    isLoading={isLeaderboardPositionLoading}
                    hasError={hasLeaderboardPositionError}
                    refetch={refetchLeaderboardPosition}
                    isCampaignComplete={isComplete}
                    outcomeStatus={participantOutcome?.outcomeStatus}
                    winnerVerificationCode={
                      participantOutcome?.winnerVerificationCode ?? null
                    }
                    onWinnerPress={navigateToWinningView}
                  />
                </Box>
              )}

              {showPortfolioSection && (
                <Box twClassName="p-4">
                  <Pressable onPress={navigateToPortfolio}>
                    <Box
                      flexDirection={BoxFlexDirection.Row}
                      alignItems={BoxAlignItems.Center}
                      twClassName="gap-2 mb-3"
                    >
                      <Text
                        variant={TextVariant.HeadingMd}
                        fontWeight={FontWeight.Bold}
                      >
                        {strings(
                          'rewards.predict_the_pitch_campaign.positions_title',
                        )}
                      </Text>
                      <Icon
                        name={IconName.ArrowRight}
                        size={IconSize.Md}
                        color={IconColor.IconAlternative}
                      />
                    </Box>
                  </Pressable>
                  <PredictThePitchPortfolio
                    positions={positions}
                    isLoading={isPositionsLoading}
                    hasError={hasPositionsError}
                    refetch={refetchPositions}
                    maxEntries={3}
                  />
                </Box>
              )}

              {showPrizePoolSection && (
                <>
                  <Box twClassName="my-1 border-b border-border-muted" />
                  <Box twClassName="p-4">
                    <Text
                      variant={TextVariant.HeadingMd}
                      fontWeight={FontWeight.Bold}
                      twClassName="mb-1"
                    >
                      {strings('rewards.campaign_prize_pool.title')}
                    </Text>
                    <PredictThePitchPrizePool
                      prizePool={prizePool}
                      isLoading={isPrizePoolLoading}
                      hasError={hasPrizePoolError}
                      refetch={refetchPrizePool}
                    />
                  </Box>
                </>
              )}

              {showLeaderboardSection && (
                <>
                  <Box twClassName="my-1 border-b border-border-muted" />
                  <Box twClassName="py-4">
                    <Pressable onPress={navigateToLeaderboard}>
                      <Box
                        flexDirection={BoxFlexDirection.Row}
                        alignItems={BoxAlignItems.Center}
                        twClassName="px-4 gap-2 mb-1"
                      >
                        <Text
                          variant={TextVariant.HeadingMd}
                          fontWeight={FontWeight.Bold}
                        >
                          {strings(
                            'rewards.predict_the_pitch_campaign.leaderboard_title',
                          )}
                        </Text>
                        <Icon
                          name={IconName.ArrowRight}
                          size={IconSize.Md}
                          color={IconColor.IconAlternative}
                        />
                      </Box>
                    </Pressable>
                    <Box
                      twClassName="px-4 gap-0.5 mb-2"
                      testID={
                        PREDICT_THE_PITCH_LEADERBOARD_TEST_IDS.TOTAL_PARTICIPANTS
                      }
                    >
                      {totalParticipants > 0 && (
                        <Text
                          variant={TextVariant.BodySm}
                          color={TextColor.TextAlternative}
                        >
                          {strings(
                            'rewards.predict_the_pitch_campaign.leaderboard_total_participants',
                            { count: totalParticipants.toLocaleString() },
                          )}
                        </Text>
                      )}
                    </Box>
                    <PredictThePitchLeaderboard
                      entries={leaderboard?.entries ?? []}
                      isLoading={isLeaderboardLoading}
                      hasError={hasLeaderboardError}
                      isLeaderboardNotYetComputed={isLeaderboardNotYetComputed}
                      onRetry={refetchLeaderboard}
                      currentUserReferralCode={referralCode}
                      userPosition={leaderboardUserPosition}
                      maxEntries={5}
                      isCampaignComplete={isComplete}
                    />
                  </Box>
                </>
              )}
            </>
          )}
        </ScrollView>

        {campaign && (
          <PredictThePitchCampaignCTA
            campaign={campaign}
            participantStatus={{
              status: participantStatusData,
              isLoading: isParticipantStatusLoading,
            }}
          />
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default PredictThePitchCampaignDetailsView;
