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
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import CampaignStatus from '../components/Campaigns/CampaignStatus';
import CampaignHowItWorks from '../components/Campaigns/CampaignHowItWorks';
import PerpsTradingCampaignLeaderboard from '../components/Campaigns/PerpsTradingCampaignLeaderboard';
import PerpsTradingCampaignPrizePool from '../components/Campaigns/PerpsTradingCampaignPrizePool';
import PerpsTradingCampaignCTA from '../components/Campaigns/PerpsTradingCampaignCTA';
import PerpsTradingCampaignStatsHeader from '../components/Campaigns/PerpsTradingCampaignStatsHeader';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useGetPerpsTradingCampaignLeaderboard } from '../hooks/useGetPerpsTradingCampaignLeaderboard';
import { useGetPerpsTradingCampaignLeaderboardPosition } from '../hooks/useGetPerpsTradingCampaignLeaderboardPosition';
import { useGetPerpsTradingCampaignPrizePool } from '../hooks/useGetPerpsTradingCampaignPrizePool';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  CampaignType,
  OndoCampaignHowItWorks,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { selectReferralCode } from '../../../../reducers/rewards/selectors';
import { getCampaignMechanicsButtonProps } from '../utils/campaignHeaderUtils';

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

  const { campaigns } = useRewardCampaigns();

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

  const { position, isLoading: isPositionLoading } =
    useGetPerpsTradingCampaignLeaderboardPosition(
      isOptedIn ? effectiveCampaignId || undefined : undefined,
    );

  const {
    prizePool,
    isLoading: isPrizePoolLoading,
    hasError: hasPrizePoolError,
    refetch: refetchPrizePool,
  } = useGetPerpsTradingCampaignPrizePool(effectiveCampaignId || undefined);

  const leaderboardUserPosition = useMemo(
    () =>
      position
        ? { rank: position.rank, neighbors: position.neighbors ?? [] }
        : null,
    [position],
  );

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
          {/* Campaign status hero */}
          {campaign && (
            <Box twClassName="p-4">
              <CampaignStatus campaign={campaign} />
            </Box>
          )}

          <Box twClassName="border-b border-border-muted" />

          {/* Not opted in — show How It Works */}
          {!isOptedIn && !isComplete && campaign?.details?.howItWorks && (
            <Box twClassName="p-4">
              <CampaignHowItWorks
                howItWorks={
                  campaign.details.howItWorks as OndoCampaignHowItWorks
                }
              />
            </Box>
          )}

          {/* Opted in + active — Stats summary, prize pool, leaderboard preview */}
          {isOptedIn && isActive && (
            <>
              {/* Stats section (navigates to full stats view) */}
              <Pressable onPress={navigateToStats}>
                <Box
                  twClassName="p-4"
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Between}
                >
                  <Text
                    variant={TextVariant.HeadingMd}
                    fontWeight={FontWeight.Bold}
                  >
                    {strings('rewards.perps_trading_campaign.stats_title')}
                  </Text>
                  <Icon
                    name={IconName.ArrowRight}
                    size={IconSize.Sm}
                    color={IconColor.IconDefault}
                  />
                </Box>
              </Pressable>
              <Box twClassName="px-4 pb-4">
                <PerpsTradingCampaignStatsHeader
                  position={position}
                  isLoading={isPositionLoading}
                />
              </Box>

              <Box twClassName="border-b border-border-muted" />

              {/* Prize pool section */}
              <Box twClassName="p-4">
                <Text
                  variant={TextVariant.HeadingMd}
                  fontWeight={FontWeight.Bold}
                >
                  {strings('rewards.perps_trading_campaign.prize_pool_title')}
                </Text>
                <PerpsTradingCampaignPrizePool
                  totalNotionalVolume={prizePool?.currentNotionalVolume ?? null}
                  isLoading={isPrizePoolLoading}
                  hasError={hasPrizePoolError}
                  refetch={refetchPrizePool}
                />
              </Box>

              <Box twClassName="border-b border-border-muted" />

              {/* Leaderboard preview (navigates to full leaderboard) */}
              <Pressable onPress={navigateToLeaderboard}>
                <Box
                  twClassName="p-4"
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Between}
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
                    size={IconSize.Sm}
                    color={IconColor.IconDefault}
                  />
                </Box>
              </Pressable>
              <Box twClassName="pb-4">
                <PerpsTradingCampaignLeaderboard
                  entries={leaderboard?.entries ?? []}
                  totalParticipants={leaderboard?.totalParticipants ?? 0}
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

          {/* Campaign complete — leaderboard only */}
          {isComplete && (
            <Box twClassName="py-4">
              <PerpsTradingCampaignLeaderboard
                entries={leaderboard?.entries ?? []}
                totalParticipants={leaderboard?.totalParticipants ?? 0}
                computedAt={leaderboard?.computedAt ?? null}
                isLoading={isLeaderboardLoading}
                hasError={hasLeaderboardError}
                isLeaderboardNotYetComputed={isLeaderboardNotYetComputed}
                onRetry={refetchLeaderboard}
                currentUserReferralCode={referralCode}
                maxEntries={5}
                campaignId={effectiveCampaignId}
              />
            </Box>
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
