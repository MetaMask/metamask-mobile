import React, { useEffect, useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
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
import CampaignJoinCTA from '../components/Campaigns/CampaignJoinCTA';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useGetOndoLeaderboard } from '../hooks/useGetOndoLeaderboard';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';

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

  const { campaigns, isLoading, hasError, fetchCampaigns } =
    useRewardCampaigns();

  const campaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId],
  );

  const participantStatus = useGetCampaignParticipantStatus(campaignId);

  useEffect(() => {
    if (campaign && getCampaignStatus(campaign) === 'upcoming') {
      navigation.navigate(Routes.REWARDS_CAMPAIGNS_VIEW as never);
    }
  }, [campaign, navigation]);

  const isOptedIn = participantStatus?.status?.optedIn === true;

  // Only fetch leaderboard data when we'll actually render the OndoLeaderboard
  // (non-opted-in view of a completed campaign)
  const leaderboardCampaignId = useMemo(
    () =>
      campaign && !isOptedIn && getCampaignStatus(campaign) === 'complete'
        ? campaignId
        : undefined,
    [campaign, isOptedIn, campaignId],
  );

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
  } = useGetOndoLeaderboard(leaderboardCampaignId);

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
          {isLoading && !campaign && (
            <Box twClassName="px-4 pt-4 gap-4">
              <Skeleton style={tw.style('h-48 rounded-xl')} />
              <Skeleton style={tw.style('h-32 rounded-xl')} />
            </Box>
          )}

          {!isLoading && hasError && !campaign && (
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

              {campaign.details?.howItWorks &&
                !isOptedIn &&
                getCampaignStatus(campaign) !== 'complete' && (
                  <>
                    <Box twClassName="border-b border-border-muted" />
                    <Box twClassName="px-4 py-4">
                      <CampaignHowItWorks
                        howItWorks={campaign.details.howItWorks}
                      />
                    </Box>
                  </>
                )}

              {/* Leaderboard section - shown when opted in, or when campaign is complete */}
              {(isOptedIn || Boolean(leaderboardCampaignId)) && (
                <>
                  <Box twClassName="border-b border-border-muted" />
                  <Box twClassName="p-4">
                    {isOptedIn ? (
                      <>
                        <Pressable
                          onPress={() =>
                            navigation.navigate(
                              Routes.REWARDS_ONDO_CAMPAIGN_LEADERBOARD as never,
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
                          </Box>
                        </Pressable>
                        <OndoLeaderboardPosition campaignId={campaignId} />
                      </>
                    ) : (
                      <>
                        <OndoLeaderboard
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
                          isLeaderboardNotYetComputed={
                            isLeaderboardNotYetComputed
                          }
                          onRetry={refetchLeaderboard}
                        />
                      </>
                    )}
                  </Box>
                </>
              )}

              {isOptedIn && (
                <>
                  <Box twClassName="border-b border-border-muted" />
                  <Box twClassName="p-4">
                    <OndoPortfolio campaignId={campaignId} />
                  </Box>
                </>
              )}
            </>
          )}
        </ScrollView>

        {campaign && (
          <CampaignJoinCTA
            campaign={campaign}
            participantStatus={participantStatus}
          />
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default OndoCampaignDetailsView;
