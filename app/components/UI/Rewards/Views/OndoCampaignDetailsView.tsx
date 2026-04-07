import React, { useEffect, useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
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
import OndoLeaderboard from '../components/Campaigns/OndoLeaderboard';
import OndoLeaderboardPosition from '../components/Campaigns/OndoLeaderboardPosition';
import OndoPortfolio from '../components/Campaigns/OndoPortfolio';
import CampaignCTA from '../components/Campaigns/CampaignCTA';
import {
  getCampaignStatus,
  isOptinAllowed,
} from '../components/Campaigns/CampaignTile.utils';
import { formatComputedAt } from '../components/Campaigns/OndoLeaderboard.utils';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import RewardsInfoBanner from '../components/RewardsInfoBanner';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useGetOndoLeaderboard } from '../hooks/useGetOndoLeaderboard';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import { useGetOndoPortfolioPosition } from '../hooks/useGetOndoPortfolioPosition';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { OndoCampaignHowItWorks } from '../../../../core/Engine/controllers/rewards-controller/types';

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type OndoCampaignDetailsRouteParams = {
  CampaignDetails: { campaignId: string };
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type RewardsCampaignStackParamList = ParamListBase & {
  RewardsCampaignsView: undefined;
  RewardsCampaignMechanics: { campaignId: string };
  RewardsOndoCampaignLeaderboard: { campaignId: string };
};

export const CAMPAIGN_DETAILS_TEST_IDS = {
  CONTAINER: 'campaign-details-container',
} as const;

const OndoCampaignDetailsView: React.FC = () => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<RewardsCampaignStackParamList>>();
  const route =
    useRoute<RouteProp<OndoCampaignDetailsRouteParams, 'CampaignDetails'>>();
  const { campaignId } = route.params;

  const {
    campaigns,
    isLoading: isCampaignsLoading,
    hasError: hasCampaignsError,
    fetchCampaigns,
  } = useRewardCampaigns();

  const campaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId],
  );

  const {
    status: participantStatusData,
    isLoading: isParticipantStatusLoading,
  } = useGetCampaignParticipantStatus(campaignId);

  useEffect(() => {
    if (campaign && getCampaignStatus(campaign) === 'upcoming') {
      navigation.navigate(Routes.REWARDS_CAMPAIGNS_VIEW);
    }
  }, [campaign, navigation]);

  const isOptedIn = participantStatusData?.optedIn === true;

  // Single fetch point for portfolio — data is passed to both the portfolio section and
  // used to gate the leaderboard rank section visibility
  const {
    portfolio: portfolioData,
    isLoading: isPortfolioLoading,
    hasError: hasPortfolioError,
    hasFetched: portfolioHasFetched,
    refetch: refetchPortfolio,
  } = useGetOndoPortfolioPosition(isOptedIn ? campaignId : undefined);

  const hasPositions = Boolean(portfolioData?.positions.length);

  const isOptinClosed = campaign !== null && !isOptinAllowed(campaign);

  const {
    tierNames,
    selectedTier,
    selectedTierData,
    computedAt,
    setSelectedTier,
    isLoading: isLeaderboardLoading,
    hasError: hasLeaderboardError,
    isLeaderboardNotYetComputed,
    refetch: refetchLeaderboard,
  } = useGetOndoLeaderboard(campaignId);

  const {
    position: leaderboardPosition,
    isLoading: isLeaderboardPositionLoading,
    hasError: hasLeaderboardPositionError,
    hasFetched: leaderboardPositionHasFetched,
    refetch: refetchLeaderboardPosition,
  } = useGetOndoLeaderboardPosition(
    isOptedIn && hasPositions ? campaignId : undefined,
  );

  const {
    showHowItWorksSection,
    showCompetitionEndedBanner,
    showLeaderboardSection,
    showLeaderboardPositionSection,
    showPortfolioSection,
  } = useMemo(() => {
    if (!campaign) {
      return {
        showHowItWorksSection: false,
        showCompetitionEndedBanner: false,
        showLeaderboardSection: false,
        showLeaderboardPositionSection: false,
        showPortfolioSection: false,
      };
    }

    const showHowItWorksSection =
      Boolean(campaign.details?.howItWorks) &&
      !hasPositions &&
      !isPortfolioLoading &&
      getCampaignStatus(campaign) === 'active' &&
      isOptinAllowed(campaign);

    const showCompetitionEndedBanner =
      getCampaignStatus(campaign) === 'complete' ||
      (!isParticipantStatusLoading &&
        isOptinClosed &&
        (!isOptedIn ||
          (portfolioHasFetched && !hasPositions && !hasPortfolioError)));

    const showLeaderboardPositionSection = isOptedIn && hasPositions;

    const showPortfolioSection =
      isOptedIn &&
      (!showCompetitionEndedBanner ||
        (hasPositions && getCampaignStatus(campaign) === 'complete') ||
        isPortfolioLoading ||
        (hasPortfolioError && !hasPositions));

    const showLeaderboardSection =
      (showCompetitionEndedBanner &&
        !showLeaderboardPositionSection &&
        !showPortfolioSection) ||
      (isOptedIn &&
        !showCompetitionEndedBanner &&
        !hasPositions &&
        !isPortfolioLoading);

    return {
      showHowItWorksSection,
      showCompetitionEndedBanner,
      showLeaderboardPositionSection,
      showLeaderboardSection,
      showPortfolioSection,
    };
  }, [
    campaign,
    isOptedIn,
    hasPositions,
    isParticipantStatusLoading,
    isOptinClosed,
    portfolioHasFetched,
    hasPortfolioError,
    isPortfolioLoading,
  ]);

  return (
    <ErrorBoundary navigation={navigation} view="OndoCampaignDetailsView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={CAMPAIGN_DETAILS_TEST_IDS.CONTAINER}
      >
        <HeaderCompactStandard
          title={campaign?.name ?? ''}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'campaign-details-back-button' }}
          endButtonIconProps={
            campaign
              ? [
                  {
                    iconName: IconName.Question,
                    onPress: () =>
                      navigation.navigate(Routes.REWARDS_CAMPAIGN_MECHANICS, {
                        campaignId,
                      }),
                    testID: 'campaign-details-mechanics-button',
                  },
                ]
              : undefined
          }
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

              {/* Phase 1: Not opted in, show how it works section */}
              {showHowItWorksSection && (
                <>
                  <Box twClassName="px-4 py-4">
                    <CampaignHowItWorks
                      howItWorks={
                        campaign.details?.howItWorks as OndoCampaignHowItWorks
                      }
                    />
                  </Box>
                </>
              )}

              {/* Competition closed banner
                  - for when cutoff date has passed and user is not opted in
                  - or when the campaign is complete */}
              {showCompetitionEndedBanner && (
                <>
                  <Box twClassName="border-b border-border-muted" />
                  <Box twClassName="px-4 py-4 gap-4">
                    <RewardsInfoBanner
                      title={strings(
                        'rewards.campaign_details.competition_closed_title',
                      )}
                      description={strings(
                        'rewards.campaign_details.competition_closed_description',
                      )}
                    />
                  </Box>
                </>
              )}

              {showLeaderboardPositionSection && (
                <>
                  <Box twClassName="border-b border-border-muted" />
                  <Box twClassName="p-4">
                    <>
                      <Pressable
                        onPress={() =>
                          navigation.navigate(
                            Routes.REWARDS_ONDO_CAMPAIGN_LEADERBOARD,
                            { campaignId },
                          )
                        }
                      >
                        <Box
                          flexDirection={BoxFlexDirection.Row}
                          alignItems={BoxAlignItems.Center}
                          justifyContent={BoxJustifyContent.Between}
                          twClassName="mb-4"
                        >
                          <Box
                            flexDirection={BoxFlexDirection.Row}
                            alignItems={BoxAlignItems.Center}
                            twClassName="gap-2"
                          >
                            <Text variant={TextVariant.HeadingMd}>
                              {strings(
                                'rewards.ondo_campaign_leaderboard.title',
                              )}
                            </Text>
                            <Icon
                              name={IconName.ArrowRight}
                              size={IconSize.Md}
                            />
                          </Box>
                          {leaderboardPosition?.computedAt && (
                            <Text
                              variant={TextVariant.BodyXs}
                              color={TextColor.TextAlternative}
                            >
                              {strings(
                                'rewards.ondo_campaign_leaderboard_position.updated_at',
                                {
                                  time: formatComputedAt(
                                    leaderboardPosition.computedAt,
                                  ),
                                },
                              )}
                            </Text>
                          )}
                        </Box>
                      </Pressable>
                      <OndoLeaderboardPosition
                        position={leaderboardPosition}
                        isLoading={isLeaderboardPositionLoading}
                        hasError={hasLeaderboardPositionError}
                        hasFetched={leaderboardPositionHasFetched}
                        refetch={refetchLeaderboardPosition}
                      />
                    </>
                  </Box>
                </>
              )}

              {showPortfolioSection && (
                <>
                  <Box twClassName="border-b border-border-muted" />
                  <Box twClassName="p-4">
                    <Pressable
                      onPress={() =>
                        navigation.navigate(
                          Routes.REWARDS_ONDO_CAMPAIGN_PORTFOLIO_VIEW,
                          { campaignId },
                        )
                      }
                    >
                      <Box
                        flexDirection={BoxFlexDirection.Row}
                        alignItems={BoxAlignItems.Center}
                        twClassName="gap-2 mb-4"
                      >
                        <Text variant={TextVariant.HeadingMd}>
                          {strings(
                            'rewards.ondo_campaign_portfolio.positions_title',
                          )}
                        </Text>
                        <Icon name={IconName.ArrowRight} size={IconSize.Md} />
                      </Box>
                    </Pressable>
                    <OndoPortfolio
                      portfolio={portfolioData}
                      isLoading={isPortfolioLoading}
                      hasError={hasPortfolioError}
                      hasFetched={portfolioHasFetched}
                      refetch={refetchPortfolio}
                    />
                  </Box>
                </>
              )}

              {showLeaderboardSection && (
                <>
                  <Box twClassName="border-b border-border-muted" />
                  <Box twClassName="p-4">
                    {isLeaderboardNotYetComputed && (
                      <Pressable
                        onPress={() =>
                          navigation.navigate(
                            Routes.REWARDS_ONDO_CAMPAIGN_LEADERBOARD,
                            { campaignId },
                          )
                        }
                      >
                        <Box
                          flexDirection={BoxFlexDirection.Row}
                          alignItems={BoxAlignItems.Center}
                          twClassName="gap-2 mb-4"
                        >
                          <Text variant={TextVariant.HeadingMd}>
                            {strings('rewards.ondo_campaign_leaderboard.title')}
                          </Text>
                          <Icon name={IconName.ArrowRight} size={IconSize.Md} />
                        </Box>
                      </Pressable>
                    )}
                    <OndoLeaderboard
                      showTitle={false}
                      tierNames={tierNames}
                      selectedTier={selectedTier}
                      onTierChange={setSelectedTier}
                      entries={selectedTierData?.entries ?? []}
                      totalParticipants={
                        selectedTierData?.totalParticipants ?? 0
                      }
                      computedAt={computedAt}
                      isLoading={isLeaderboardLoading}
                      hasError={hasLeaderboardError}
                      isLeaderboardNotYetComputed={isLeaderboardNotYetComputed}
                      onRetry={refetchLeaderboard}
                    />
                  </Box>
                </>
              )}
            </>
          )}
        </ScrollView>

        {campaign && (
          <CampaignCTA
            campaign={campaign}
            participantStatus={{
              status: participantStatusData,
              isLoading: isParticipantStatusLoading,
            }}
            hasPositions={hasPositions}
          />
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default OndoCampaignDetailsView;
