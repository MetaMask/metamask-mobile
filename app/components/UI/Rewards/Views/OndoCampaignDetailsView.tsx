import React, { useEffect, useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { selectReferralCode } from '../../../../reducers/rewards/selectors';
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
  TextButton,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import CampaignStatus from '../components/Campaigns/CampaignStatus';
import CampaignHowItWorks from '../components/Campaigns/CampaignHowItWorks';
import OndoLeaderboard from '../components/Campaigns/OndoLeaderboard';
import OndoPortfolio from '../components/Campaigns/OndoPortfolio';
import OndoAccountPickerSheet from '../components/Campaigns/OndoAccountPickerSheet';
import OndoCampaignCTA from '../components/Campaigns/OndoCampaignCTA';
import CampaignStatsSummary from '../components/Campaigns/CampaignStatsSummary';
import OndoPrizePool from '../components/Campaigns/OndoPrizePool';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useGetOndoLeaderboard } from '../hooks/useGetOndoLeaderboard';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import { useGetOndoPortfolioPosition } from '../hooks/useGetOndoPortfolioPosition';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { useOndoAccountPicker } from '../hooks/useOndoAccountPicker';
import { useGetOndoCampaignDeposits } from '../hooks/useGetOndoCampaignDeposits';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { OndoCampaignHowItWorks } from '../../../../core/Engine/controllers/rewards-controller/types';

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type OndoCampaignDetailsRouteParams = {
  CampaignDetails: { campaignId: string };
};

export const CAMPAIGN_DETAILS_TEST_IDS = {
  CONTAINER: 'campaign-details-container',
} as const;

const OndoCampaignDetailsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<OndoCampaignDetailsRouteParams, 'CampaignDetails'>>();
  const { campaignId } = route.params;

  const referralCode = useSelector(selectReferralCode);
  const { pendingPicker, setPendingPicker, sheetRef, handleGroupSelect } =
    useOndoAccountPicker(campaignId);

  const {
    deposits,
    isLoading: isDepositsLoading,
    hasError: hasDepositsError,
    refetch: refetchDeposits,
  } = useGetOndoCampaignDeposits(campaignId);

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

  // Single fetch point for portfolio — only fetches when opted in
  const {
    portfolio: portfolioData,
    isLoading: isPortfolioLoading,
    hasError: hasPortfolioError,
    refetch: refetchPortfolio,
  } = useGetOndoPortfolioPosition(isOptedIn ? campaignId : undefined);

  const hasPositions = Boolean(portfolioData?.positions.length);

  const {
    position: leaderboardPosition,
    isLoading: isLeaderboardPositionLoading,
    hasError: hasLeaderboardPositionError,
    refetch: refetchLeaderboardPosition,
  } = useGetOndoLeaderboardPosition(
    isOptedIn && hasPositions ? campaignId : undefined,
  );

  const {
    tierNames,
    selectedTier,
    selectedTierData,
    setSelectedTier,
    isLoading: isLeaderboardLoading,
    hasError: hasLeaderboardError,
    isLeaderboardNotYetComputed,
    refetch: refetchLeaderboard,
  } = useGetOndoLeaderboard(campaignId, {
    defaultTier: leaderboardPosition?.projectedTier,
  });

  const {
    showHowItWorksSection,
    showStatsSummarySection,
    showLeaderboardSection,
    showPortfolioSection,
  } = useMemo(() => {
    if (!campaign) {
      return {
        showHowItWorksSection: false,
        showStatsSummarySection: false,
        showLeaderboardSection: false,
        showPortfolioSection: false,
      };
    }

    const showHowItWorksSection =
      Boolean(campaign.details?.howItWorks) &&
      !hasPositions &&
      getCampaignStatus(campaign) === 'active';

    const showStatsSummarySection = hasPositions;

    return {
      showHowItWorksSection,
      showStatsSummarySection,
      showPortfolioSection: isOptedIn,
      showLeaderboardSection: true,
    };
  }, [campaign, isOptedIn, hasPositions]);

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

              <Box twClassName="p-4">
                <Text variant={TextVariant.HeadingMd} twClassName="mb-1">
                  {strings('rewards.ondo_campaign_prize_pool.title')}
                </Text>
                <OndoPrizePool
                  totalUsdDeposited={deposits?.totalUsdDeposited ?? null}
                  isLoading={isDepositsLoading}
                  hasError={hasDepositsError}
                  refetch={refetchDeposits}
                />
              </Box>

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

              {showStatsSummarySection && (
                <>
                  <Box twClassName="p-4">
                    <CampaignStatsSummary
                      leaderboardPosition={leaderboardPosition}
                      portfolioSummary={portfolioData?.summary ?? null}
                      leaderboard={{
                        isLoading: isLeaderboardPositionLoading,
                        hasError: hasLeaderboardPositionError,
                        refetch: refetchLeaderboardPosition,
                      }}
                      portfolio={{
                        isLoading: isPortfolioLoading,
                        hasError: hasPortfolioError,
                        refetch: refetchPortfolio,
                      }}
                    />
                  </Box>
                </>
              )}

              {showPortfolioSection && (
                <>
                  <Box twClassName="p-4">
                    <Box
                      flexDirection={BoxFlexDirection.Row}
                      alignItems={BoxAlignItems.Center}
                      justifyContent={BoxJustifyContent.Between}
                      twClassName="mb-4"
                    >
                      <Text variant={TextVariant.HeadingMd}>
                        {strings(
                          'rewards.ondo_campaign_portfolio.positions_title',
                        )}
                      </Text>
                      <TextButton
                        variant={TextVariant.BodyMd}
                        onPress={() =>
                          navigation.navigate(
                            Routes.REWARDS_ONDO_CAMPAIGN_PORTFOLIO_VIEW,
                            { campaignId },
                          )
                        }
                      >
                        {strings(
                          'rewards.ondo_campaign_portfolio.view_activity',
                        )}
                      </TextButton>
                    </Box>
                    <OndoPortfolio
                      portfolio={portfolioData}
                      isLoading={isPortfolioLoading}
                      hasError={hasPortfolioError}
                      refetch={refetchPortfolio}
                      campaignId={campaignId}
                      onOpenAccountPicker={setPendingPicker}
                      isCampaignComplete={
                        getCampaignStatus(campaign) === 'complete'
                      }
                    />
                  </Box>
                </>
              )}

              {showLeaderboardSection && (
                <>
                  <Box twClassName="py-4">
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
                        twClassName="gap-2 mb-4 px-4"
                      >
                        <Text variant={TextVariant.HeadingMd}>
                          {strings('rewards.ondo_campaign_leaderboard.title')}
                        </Text>
                        <Icon name={IconName.ArrowRight} size={IconSize.Md} />
                      </Box>
                    </Pressable>
                    <OndoLeaderboard
                      tierNames={tierNames}
                      selectedTier={selectedTier}
                      onTierChange={setSelectedTier}
                      entries={selectedTierData?.entries ?? []}
                      totalParticipants={
                        selectedTierData?.totalParticipants ?? 0
                      }
                      isLoading={isLeaderboardLoading}
                      hasError={hasLeaderboardError}
                      isLeaderboardNotYetComputed={isLeaderboardNotYetComputed}
                      onRetry={refetchLeaderboard}
                      maxEntries={5}
                      currentUserReferralCode={referralCode}
                      userPosition={
                        leaderboardPosition
                          ? {
                              projectedTier: leaderboardPosition.projectedTier,
                              rank: leaderboardPosition.rank,
                              neighbors: leaderboardPosition.neighbors,
                            }
                          : null
                      }
                    />
                  </Box>
                </>
              )}
            </>
          )}
        </ScrollView>

        {campaign && (
          <OndoCampaignCTA
            campaign={campaign}
            participantStatus={{
              status: participantStatusData,
              isLoading: isParticipantStatusLoading,
            }}
            hasPositions={hasPositions}
            campaignId={campaignId}
          />
        )}

        {pendingPicker && (
          <OndoAccountPickerSheet
            pendingPicker={pendingPicker}
            sheetRef={sheetRef}
            onClose={() => setPendingPicker(null)}
            onGroupSelect={handleGroupSelect}
          />
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default OndoCampaignDetailsView;
