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

export const CAMPAIGN_CTA_TEST_IDS = {
  CTA_BUTTON: 'campaign-details-cta-button',
} as const;

interface CampaignOptInCtaProps {
  campaign: CampaignDto;
  participantStatus: Pick<
    UseGetCampaignParticipantStatusResult,
    'status' | 'isLoading'
  >;
  onJoinPress?: () => void;
}

/**
 * General campaign opt-in CTA.
 * Shows a "Join Campaign" button when the campaign is active, the user has not opted in,
 * and the opt-in window is still open. Returns null in all other cases.
 */
const CampaignOptInCta: React.FC<CampaignOptInCtaProps> = ({
  campaign,
  participantStatus,
  onJoinPress,
}) => {
  const [isOptInSheetOpen, setIsOptInSheetOpen] = useState(false);

  const campaignStatus = getCampaignStatus(campaign);
  const isLoading = participantStatus.isLoading;
  const isOptedIn = participantStatus?.status?.optedIn === true;

  const isActive = !isLoading && campaignStatus === 'active';

  if (!isActive || isOptedIn) {
    return null;
  }

  return (
    <>
      <Box twClassName="px-4 pt-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={() => {
            onJoinPress?.();
            setIsOptInSheetOpen(true);
          }}
          testID={CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON}
        >
          {strings('rewards.campaign_details.join_campaign')}
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

export default CampaignOptInCta;
