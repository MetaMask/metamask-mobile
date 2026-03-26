import React, { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import type { UseGetCampaignParticipantStatusResult } from '../../hooks/useGetCampaignParticipantStatus';
import CampaignOptInSheet from './CampaignOptInSheet';
import { getCampaignStatus, isOptinAllowed } from './CampaignTile.utils';
import { strings } from '../../../../../../locales/i18n';
import useRewardsToast from '../../hooks/useRewardsToast';

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
 * Hidden once the user has opted in, the campaign is no longer active,
 * or the deposit cutoff date has passed.
 */
const CampaignJoinCTA: React.FC<CampaignJoinCTAProps> = ({
  campaign,
  participantStatus,
}) => {
  const [isOptInSheetOpen, setIsOptInSheetOpen] = useState(false);
  const { showToast, RewardsToastOptions } = useRewardsToast();

  const hasShownEntriesClosedToastRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (participantStatus.status?.optedIn === true) {
        return;
      }
      if (participantStatus.isLoading) {
        return;
      }
      if (getCampaignStatus(campaign) !== 'active') {
        return;
      }
      if (isOptinAllowed(campaign)) {
        return;
      }
      if (hasShownEntriesClosedToastRef.current) {
        return;
      }
      hasShownEntriesClosedToastRef.current = true;
      showToast(
        RewardsToastOptions.entriesClosed(
          strings('rewards.campaign_details.entries_closed_title'),
          strings('rewards.campaign_details.entries_closed_description'),
        ),
      );
    }, [
      campaign,
      participantStatus.isLoading,
      participantStatus.status?.optedIn,
      showToast,
      RewardsToastOptions,
    ]),
  );

  if (
    participantStatus.status?.optedIn === true ||
    getCampaignStatus(campaign) !== 'active' ||
    !isOptinAllowed(campaign)
  ) {
    return null;
  }

  if (!isOptinAllowed(campaign)) {
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

export default CampaignJoinCTA;
