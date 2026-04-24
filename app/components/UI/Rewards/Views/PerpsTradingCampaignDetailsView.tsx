import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
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
import CampaignStatus from '../components/Campaigns/CampaignStatus';
import CampaignHowItWorks from '../components/Campaigns/CampaignHowItWorks';
import PerpsTradingCampaignLeaderboard, {
  PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS,
} from '../components/Campaigns/PerpsTradingCampaignLeaderboard';
import PerpsTradingCampaignPrizePool from '../components/Campaigns/PerpsTradingCampaignPrizePool';
import PerpsTradingCampaignCTA from '../components/Campaigns/PerpsTradingCampaignCTA';
import PerpsCampaignStatsSummary from '../components/Campaigns/PerpsCampaignStatsSummary';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useGetPerpsTradingCampaignLeaderboard } from '../hooks/useGetPerpsTradingCampaignLeaderboard';
import { useGetPerpsTradingCampaignLeaderboardPosition } from '../hooks/useGetPerpsTradingCampaignLeaderboardPosition';
import { useGetPerpsTradingCampaignVolume } from '../hooks/useGetPerpsTradingCampaignVolume';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  CampaignType,
  OndoCampaignHowItWorks,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { selectReferralCode } from '../../../../reducers/rewards/selectors';
import { getCampaignMechanicsButtonProps } from '../utils/campaignHeaderUtils';
import RewardsErrorBanner from '../components/RewardsErrorBanner';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type PerpsTradingCampaignDetailsRouteParams = {
  RewardsPerpsTradingCampaignDetails: { campaignId?: string };
};

export const PERPS_CAMPAIGN_DETAILS_TEST_IDS = {
  CONTAINER: 'perps-campaign-details-container',
} as const;

const PerpsTradingCampaignDetailsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<
      RouteProp<
        PerpsTradingCampaignDetailsRouteParams,
        'RewardsPerpsTradingCampaignDetails'
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
          : c.type === CampaignType.PERPS_TRADING,
      ) ?? null,
    [campaigns, routeCampaignId],
  );

  const effectiveCampaignId = routeCampaignId ?? campaign?.id ?? '';

  const {
    status: participantStatusData,
    isLoading: isParticipantStatusLoading,
  } = useGetCampaignParticipantStatus(effectiveCampaignId || undefined);

  const isOptedIn = participantStatusData?.optedIn === true;
  const campaignStatus = campaign ? getCampaignStatus(campaign) : null;
  const isActive = campaignStatus === 'active';
  const isComplete = campaignStatus === 'complete';

  const {
    leaderboard,
    isLoading: isLeaderboardLoading,
    hasError: hasLeaderboardError,
    isLeaderboardNotYetComputed,
    refetch: refetchLeaderboard,
  } = useGetPerpsTradingCampaignLeaderboard(effectiveCampaignId || undefined);

  const { position } = useGetPerpsTradingCampaignLeaderboardPosition(
    isOptedIn ? effectiveCampaignId || undefined : undefined,
  );

  const {
    volume,
    isLoading: isVolumeLoading,
    hasError: hasVolumeError,
    refetch: refetchVolume,
  } = useGetPerpsTradingCampaignVolume(effectiveCampaignId || undefined);

  const leaderboardUserPosition = useMemo(
    () =>
      position
        ? { rank: position.rank, neighbors: position.neighbors ?? [] }
        : null,
    [position],
  );

  const hasPosition = Boolean(leaderboardUserPosition);
  const totalParticipants = leaderboard?.totalParticipants ?? 0;

  const {
    showHowItWorksSection,
    showStatsSummarySection,
    showPrizePoolSection,
    showLeaderboardSection,
  } = useMemo(() => {
    if (!campaign) {
      return {
        showHowItWorksSection: false,
        showStatsSummarySection: false,
        showPrizePoolSection: false,
        showLeaderboardSection: false,
      };
    }

    return {
      showHowItWorksSection:
        Boolean(campaign.details?.howItWorks) && isActive && !hasPosition,
      showStatsSummarySection: hasPosition,
      showPrizePoolSection: isActive,
      showLeaderboardSection: true,
    };
  }, [campaign, isActive, hasPosition]);

  const navigateToLeaderboard = useCallback(() => {
    if (!effectiveCampaignId) return;
    navigation.navigate(Routes.REWARDS_PERPS_TRADING_CAMPAIGN_LEADERBOARD, {
      campaignId: effectiveCampaignId,
    });
  }, [navigation, effectiveCampaignId]);

  const navigateToStats = useCallback(() => {
    if (!effectiveCampaignId) return;
    navigation.navigate(Routes.REWARDS_PERPS_TRADING_CAMPAIGN_STATS, {
      campaignId: effectiveCampaignId,
    });
  }, [navigation, effectiveCampaignId]);

  const navigateToMechanics = useCallback(() => {
    if (!effectiveCampaignId) return;
    navigation.navigate(Routes.REWARDS_CAMPAIGN_MECHANICS, {
      campaignId: effectiveCampaignId,
    });
  }, [navigation, effectiveCampaignId]);

  return (
    <ErrorBoundary
      navigation={navigation}
      view="PerpsTradingCampaignDetailsView"
    >
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={PERPS_CAMPAIGN_DETAILS_TEST_IDS.CONTAINER}
      >
        <HeaderCompactStandard
          title={strings('rewards.perps_trading_campaign.title')}
          titleProps={{ variant: TextVariant.HeadingSm }}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'perps-details-back-button' }}
          endButtonIconProps={getCampaignMechanicsButtonProps(
            campaign != null,
            navigateToMechanics,
            'perps-details-mechanics-button',
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
                <Box twClassName="p-4">
                  <CampaignHowItWorks
                    howItWorks={
                      campaign.details?.howItWorks as OndoCampaignHowItWorks
                    }
                  />
                </Box>
              )}

              {showStatsSummarySection && (
                <Box twClassName="p-4">
                  <Pressable onPress={navigateToStats}>
                    <Box
                      flexDirection={BoxFlexDirection.Row}
                      alignItems={BoxAlignItems.Center}
                      justifyContent={BoxJustifyContent.Between}
                      twClassName="gap-2 mb-3"
                    >
                      <Text
                        variant={TextVariant.HeadingMd}
                        fontWeight={FontWeight.Bold}
                      >
                        {strings('rewards.perps_trading_campaign.stats_title')}
                      </Text>
                      <Icon
                        name={IconName.ArrowRight}
                        size={IconSize.Md}
                        color={IconColor.IconAlternative}
                      />
                    </Box>
                  </Pressable>
                  <PerpsCampaignStatsSummary
                    leaderboardPosition={position}
                    leaderboard={leaderboard}
                    isCampaignComplete={isComplete}
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
                      {strings(
                        'rewards.perps_trading_campaign.prize_pool_title',
                      )}
                    </Text>
                    <PerpsTradingCampaignPrizePool
                      totalNotionalVolume={volume?.totalUsdVolume ?? null}
                      isLoading={isVolumeLoading}
                      hasError={hasVolumeError}
                      refetch={refetchVolume}
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
                        justifyContent={BoxJustifyContent.Between}
                        twClassName="px-4"
                      >
                        <Text
                          variant={TextVariant.HeadingMd}
                          fontWeight={FontWeight.Bold}
                        >
                          {strings(
                            'rewards.perps_trading_campaign.leaderboard_title',
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
                        PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS.TOTAL_PARTICIPANTS
                      }
                    >
                      {totalParticipants > 0 && (
                        <Text
                          variant={TextVariant.BodySm}
                          color={TextColor.TextAlternative}
                        >
                          {strings(
                            'rewards.perps_trading_campaign.leaderboard_total_participants',
                            { count: totalParticipants.toLocaleString() },
                          )}
                        </Text>
                      )}
                    </Box>
                    <PerpsTradingCampaignLeaderboard
                      entries={leaderboard?.entries ?? []}
                      totalParticipants={totalParticipants}
                      computedAt={leaderboard?.computedAt ?? null}
                      isLoading={isLeaderboardLoading}
                      hasError={hasLeaderboardError}
                      isLeaderboardNotYetComputed={isLeaderboardNotYetComputed}
                      onRetry={refetchLeaderboard}
                      currentUserReferralCode={referralCode}
                      userPosition={leaderboardUserPosition}
                      maxEntries={5}
                      campaignId={effectiveCampaignId}
                    />
                  </Box>
                </>
              )}
            </>
          )}
        </ScrollView>

        {/* Bottom CTA */}
        {campaign && (
          <PerpsTradingCampaignCTA
            campaign={campaign}
            participantStatus={{
              status: participantStatusData ?? null,
              isLoading: isParticipantStatusLoading,
            }}
          />
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default PerpsTradingCampaignDetailsView;
