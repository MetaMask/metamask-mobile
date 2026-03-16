import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import type { CampaignDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import CampaignStatus from '../components/Campaigns/CampaignStatus';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useOptInToCampaign } from '../hooks/useOptInToCampaign';
import { handleDeeplink } from '../../../../core/DeeplinkManager';
import CampaignHowItWorks from '../components/Campaigns/CampaignHowItWorks';
import CampaignLeaderboard from '../components/Campaigns/CampaignLeaderboard';
import Routes from '../../../../constants/navigation/Routes';

const SWAP_DEEPLINK = 'https://link.metamask.io/swap';

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type CampaignDetailsRouteParams = {
  CampaignDetails: { campaign: CampaignDto };
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
  const { campaign } = route.params;

  const { status: participantStatus, isLoading: isStatusLoading } =
    useGetCampaignParticipantStatus(campaign.id);
  const { optInToCampaign, isOptingIn } = useOptInToCampaign();

  const isOptedIn = participantStatus?.optedIn === true;

  const handleMechanicsPress = useCallback(() => {
    navigation.navigate(Routes.CAMPAIGN_MECHANICS, {
      campaignId: campaign.id,
    });
  }, [navigation, campaign.id]);

  const handleCtaPress = useCallback(async () => {
    if (isOptedIn) {
      handleDeeplink({ uri: SWAP_DEEPLINK });
    } else {
      await optInToCampaign(campaign.id);
    }
  }, [isOptedIn, optInToCampaign, campaign.id]);

  return (
    <ErrorBoundary navigation={navigation} view="CampaignDetailsView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={CAMPAIGN_DETAILS_TEST_IDS.CONTAINER}
      >
        <HeaderCompactStandard
          title={campaign.name}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          endButtonIconProps={[
            {
              iconName: IconName.Question,
              onPress: handleMechanicsPress,
              testID: 'campaign-details-mechanics-button',
            },
          ]}
          includesTopInset
        />
        <ScrollView showsVerticalScrollIndicator={false}>
          <Box twClassName="border-b border-border-muted">
            <CampaignStatus campaign={campaign} />
          </Box>
          {campaign.details?.howItWorks && (
            <Box twClassName="border-b border-border-muted">
              <CampaignHowItWorks howItWorks={campaign.details.howItWorks} />
            </Box>
          )}
          <CampaignLeaderboard campaignId={campaign.id} />
        </ScrollView>

        <Box twClassName="px-4 pb-4 pt-2">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleCtaPress}
            isDisabled={isOptingIn || isStatusLoading}
            isLoading={isOptingIn}
            testID={CAMPAIGN_DETAILS_TEST_IDS.CTA_BUTTON}
          >
            {isOptedIn
              ? strings('rewards.campaign_details.swap')
              : strings('rewards.campaign_details.join_campaign')}
          </Button>
        </Box>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default CampaignDetailsView;
