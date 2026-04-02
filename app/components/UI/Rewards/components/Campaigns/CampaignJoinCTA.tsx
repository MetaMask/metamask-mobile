import React from 'react';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import type { UseGetCampaignParticipantStatusResult } from '../../hooks/useGetCampaignParticipantStatus';
import { getCampaignStatus, isOptinAllowed } from './CampaignTile.utils';
import { strings } from '../../../../../../locales/i18n';

export const CAMPAIGN_JOIN_CTA_TEST_IDS = {
  CTA_BUTTON: 'campaign-details-cta-button',
} as const;

interface CampaignJoinCTAProps {
  campaign: CampaignDto;
  participantStatus: Pick<
    UseGetCampaignParticipantStatusResult,
    'status' | 'isLoading'
  >;
  onOptInPress: () => void;
}

/**
 * Renders the "Join Campaign" CTA button.
 * Hidden once the user has opted in, the campaign is no longer active,
 * or the deposit cutoff date has passed.
 */
const CampaignJoinCTA: React.FC<CampaignJoinCTAProps> = ({
  campaign,
  participantStatus,
  onOptInPress,
}) => {
  if (
    !participantStatus ||
    participantStatus.isLoading ||
    participantStatus.status?.optedIn === true ||
    getCampaignStatus(campaign) !== 'active' ||
    !isOptinAllowed(campaign)
  ) {
    return null;
  }

  return (
    <Box twClassName="px-4 pb-4 pt-2">
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={onOptInPress}
        testID={CAMPAIGN_JOIN_CTA_TEST_IDS.CTA_BUTTON}
      >
        {strings('rewards.campaign_details.join_campaign')}
      </Button>
    </Box>
  );
};

export default CampaignJoinCTA;
