import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import type { UseGetCampaignParticipantStatusResult } from '../../hooks/useGetCampaignParticipantStatus';
import CampaignOptInSheet from './CampaignOptInSheet';
import { getCampaignStatus } from './CampaignTile.utils';
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
}

/**
 * Renders the "Join Campaign" CTA button and opt-in bottom sheet.
 * Hidden once the user has opted in or the campaign is complete.
 */
const CampaignJoinCTA: React.FC<CampaignJoinCTAProps> = ({
  campaign,
  participantStatus,
}) => {
  const [isOptInSheetOpen, setIsOptInSheetOpen] = useState(false);

  if (
    participantStatus.status?.optedIn === true ||
    getCampaignStatus(campaign) !== 'active'
  ) {
    return null;
  }

  return (
    <>
      <Box twClassName="px-4 pb-4 pt-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={() => setIsOptInSheetOpen(true)}
          isLoading={participantStatus.isLoading}
          isDisabled={participantStatus.isLoading}
          testID={CAMPAIGN_JOIN_CTA_TEST_IDS.CTA_BUTTON}
        >
          {participantStatus.isLoading
            ? strings('rewards.campaign_details.checking_opt_in_status')
            : strings('rewards.campaign_details.join_campaign')}
        </Button>
      </Box>

      {isOptInSheetOpen && (
        <CampaignOptInSheet
          campaign={campaign}
          onClose={() => setIsOptInSheetOpen(false)}
        />
      )}
    </>
  );
};

export default CampaignJoinCTA;
