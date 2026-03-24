import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  IconName,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import CampaignStatus from '../components/Campaigns/CampaignStatus';
import CampaignHowItWorks from '../components/Campaigns/CampaignHowItWorks';
import CampaignOptInSheet from '../components/Campaigns/CampaignOptInSheet';
import PreviousSeasonSummary from '../components/PreviousSeason/PreviousSeasonSummary';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import {
  getCampaignStatus,
  isCampaignTypeSupported,
} from '../components/Campaigns/CampaignTile.utils';
import { CampaignType } from '../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type CampaignDetailsRouteParams = {
  CampaignDetails: { campaignId: string };
};

export const CAMPAIGN_DETAILS_TEST_IDS = {
  CONTAINER: 'campaign-details-container',
  CTA_BUTTON: 'campaign-details-cta-button',
} as const;

const CampaignDetailsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<CampaignDetailsRouteParams, 'CampaignDetails'>>();
  const { campaignId } = route.params;

  const [isOptInSheetOpen, setIsOptInSheetOpen] = useState(false);

  const { campaigns, isLoading, hasError, fetchCampaigns } =
    useRewardCampaigns();

  const campaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId],
  );

  const { status: participantStatus, isLoading: isStatusLoading } =
    useGetCampaignParticipantStatus(campaignId);

  const campaignStatus = campaign ? getCampaignStatus(campaign) : null;
  const isCampaignActive = campaignStatus === 'active';
  const isCampaignComplete = campaignStatus === 'complete';

  // Redirect to campaigns overview if campaign type is not supported
  useEffect(() => {
    if (campaign && !isCampaignTypeSupported(campaign.type)) {
      navigation.navigate(Routes.CAMPAIGNS_VIEW);
    }
  }, [campaign, navigation]);

  const campaignDetailsContent = useMemo(() => {
    if (!campaign) return null;

    // For ONDO_HOLDING campaigns, show How It Works section
    if (
      campaign.type === CampaignType.ONDO_HOLDING &&
      campaign.details?.howItWorks
    ) {
      return (
        <>
          <Box twClassName="border-b border-border-muted" />
          <Box twClassName="px-4 py-4">
            <CampaignHowItWorks howItWorks={campaign.details.howItWorks} />
          </Box>
        </>
      );
    }

    // For SEASON_1 campaigns that are complete, show PreviousSeasonSummary
    if (campaign.type === CampaignType.SEASON_1 && isCampaignComplete) {
      return (
        <>
          <Box twClassName="border-b border-border-muted" />
          <PreviousSeasonSummary />
        </>
      );
    }

    return null;
  }, [campaign, isCampaignComplete]);

  return (
    <ErrorBoundary navigation={navigation} view="CampaignDetailsView">
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
                      navigation.navigate(Routes.CAMPAIGN_MECHANICS, {
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
              <CampaignStatus campaign={campaign} />
              {campaignDetailsContent}
            </>
          )}
        </ScrollView>

        {campaign &&
          participantStatus?.optedIn !== true &&
          !isCampaignComplete && (
            <Box twClassName="px-4 pb-4 pt-2">
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={() => setIsOptInSheetOpen(true)}
                isLoading={isStatusLoading}
                isDisabled={isStatusLoading || !isCampaignActive}
                testID={CAMPAIGN_DETAILS_TEST_IDS.CTA_BUTTON}
              >
                {isStatusLoading
                  ? strings('rewards.campaign_details.checking_opt_in_status')
                  : strings('rewards.campaign_details.join_campaign')}
              </Button>
            </Box>
          )}

        {isOptInSheetOpen && campaign && (
          <CampaignOptInSheet
            campaign={campaign}
            onClose={() => setIsOptInSheetOpen(false)}
          />
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default CampaignDetailsView;
