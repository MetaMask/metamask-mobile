import React, { useCallback } from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import type { UseGetCampaignParticipantStatusResult } from '../../hooks/useGetCampaignParticipantStatus';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { PredictEventValues } from '../../../Predict/constants/eventNames';
import { usePredictEligibility } from '../../../Predict/hooks/usePredictEligibility';
import CampaignOptInCta, { CAMPAIGN_CTA_TEST_IDS } from './CampaignOptInCta';
import { getCampaignStatus } from './CampaignTile.utils';

interface PredictThePitchCampaignCTAProps {
  campaign: CampaignDto;
  participantStatus: Pick<
    UseGetCampaignParticipantStatusResult,
    'status' | 'isLoading'
  >;
}

const PredictThePitchCampaignCTA: React.FC<PredictThePitchCampaignCTAProps> = ({
  campaign,
  participantStatus,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { isEligible: isPredictEligible } = usePredictEligibility();
  const campaignStatus = getCampaignStatus(campaign);
  const isLoading = participantStatus.isLoading;
  const isOptedIn = participantStatus.status?.optedIn === true;

  const navigateToPredictWorldCup = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.WORLD_CUP,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.REWARDS,
      },
    });
  }, [navigation]);

  if (!isLoading && campaignStatus === 'active' && isOptedIn) {
    return (
      <Box twClassName="p-4 mb-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={navigateToPredictWorldCup}
          testID={CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON}
        >
          {strings('rewards.predict_the_pitch_campaign.predict_now_cta')}
        </Button>
      </Box>
    );
  }

  return (
    <CampaignOptInCta
      campaign={campaign}
      participantStatus={participantStatus}
      isFeatureGeoRestricted={!isPredictEligible}
    />
  );
};

export default PredictThePitchCampaignCTA;
