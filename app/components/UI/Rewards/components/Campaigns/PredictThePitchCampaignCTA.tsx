import React, { useCallback } from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import type { UseGetCampaignParticipantStatusResult } from '../../hooks/useGetCampaignParticipantStatus';
import { strings } from '../../../../../../locales/i18n';
import {
  PredictEventValues,
  usePredictAvailability,
  usePredictCampaignEligibility,
  usePredictEntryActions,
  type PredictIntent,
} from '../../../PredictNext';
import { PREDICT_THE_PITCH_PREDICT_CAMPAIGN } from '../../utils/predictCampaignConstants';
import CampaignOptInCta, { CAMPAIGN_CTA_TEST_IDS } from './CampaignOptInCta';
import { getCampaignStatus } from './CampaignTile.utils';

/** "Predict now": Predict Home, scoped to the campaign's Venue. */
const PREDICT_NOW_INTENT: PredictIntent = {
  type: 'home',
  entryPoint: PredictEventValues.ENTRY_POINT.REWARDS,
  campaign: PREDICT_THE_PITCH_PREDICT_CAMPAIGN,
};

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
  const { openPredict, canOpenPredict } = usePredictEntryActions();
  const isPredictAvailable = usePredictAvailability();
  const isPredictEligible = usePredictCampaignEligibility(
    PREDICT_THE_PITCH_PREDICT_CAMPAIGN,
  );
  const campaignStatus = getCampaignStatus(campaign);
  const isLoading = participantStatus.isLoading;
  const isOptedIn = participantStatus.status?.optedIn === true;

  const navigateToPredict = useCallback(() => {
    openPredict(PREDICT_NOW_INTENT);
  }, [openPredict]);

  if (!isLoading && campaignStatus === 'active' && isOptedIn) {
    // Absent, not disabled, while the campaign's Venue is not active.
    if (!isPredictAvailable || !canOpenPredict(PREDICT_NOW_INTENT)) {
      return null;
    }
    return (
      <Box twClassName="p-4 mb-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={navigateToPredict}
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
