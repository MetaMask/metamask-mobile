import React, { useCallback } from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import type { UseGetCampaignParticipantStatusResult } from '../../hooks/useGetCampaignParticipantStatus';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import CampaignOptInCta, { CAMPAIGN_CTA_TEST_IDS } from './CampaignOptInCta';
import { getCampaignStatus } from './CampaignTile.utils';

interface PredictThePitchCampaignCTAProps {
  campaign: CampaignDto;
  participantStatus: Pick<
    UseGetCampaignParticipantStatusResult,
    'status' | 'isLoading'
  >;
  campaignId: string;
}

const PredictThePitchCampaignCTA: React.FC<PredictThePitchCampaignCTAProps> = ({
  campaign,
  participantStatus,
  campaignId,
}) => {
  const navigation = useNavigation();

  const campaignStatus = getCampaignStatus(campaign);
  const isLoading = participantStatus.isLoading;
  const isOptedIn = participantStatus.status?.optedIn === true;

  const navigateToEligibleMarkets = useCallback(() => {
    navigation.navigate(
      Routes.REWARDS_PREDICT_THE_PITCH_ELIGIBLE_MARKETS_VIEW,
      {
        campaignId,
      },
    );
  }, [campaignId, navigation]);

  if (!isLoading && campaignStatus === 'active' && isOptedIn) {
    return (
      <Box twClassName="p-4 mb-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={navigateToEligibleMarkets}
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
    />
  );
};

export default PredictThePitchCampaignCTA;
