import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import CampaignHowItWorks from '../components/Campaigns/CampaignHowItWorks';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { CampaignType } from '../../../../core/Engine/controllers/rewards-controller/types';

interface PredictThePitchCampaignDetailsRouteParams {
  RewardsPredictThePitchCampaignDetails: { campaignId?: string };
}

export const PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW_TEST_IDS = {
  CONTAINER: 'predict-the-pitch-campaign-details-view-container',
  HOW_IT_WORKS: 'predict-the-pitch-campaign-details-how-it-works',
} as const;

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
  const { campaignId } = route.params ?? {};
  const { campaigns } = useRewardCampaigns();
  const campaign = useMemo(
    () =>
      campaignId
        ? (campaigns.find((c) => c.id === campaignId) ?? null)
        : (campaigns.find((c) => c.type === CampaignType.PREDICT_THE_PITCH) ??
          null),
    [campaignId, campaigns],
  );

  useTrackRewardsPageView({
    page_type: 'predict_the_pitch_campaign_details',
    campaign_id: campaign?.id ?? campaignId,
  });

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
          title={campaign?.name ?? 'Predict The Pitch'}
          onBack={() => navigation.goBack()}
          backButtonProps={{
            testID: 'predict-the-pitch-campaign-details-back-button',
          }}
          includesTopInset
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
        >
          {campaign?.details?.howItWorks ? (
            <Box
              twClassName="px-4 py-4"
              testID={
                PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW_TEST_IDS.HOW_IT_WORKS
              }
            >
              <CampaignHowItWorks howItWorks={campaign.details.howItWorks} />
            </Box>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default PredictThePitchCampaignDetailsView;
