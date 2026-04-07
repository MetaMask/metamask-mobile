import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  IconName,
} from '@metamask/design-system-react-native';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import type { UseGetCampaignParticipantStatusResult } from '../../hooks/useGetCampaignParticipantStatus';
import CampaignOptInSheet from './CampaignOptInSheet';
import { getCampaignStatus, isOptinAllowed } from './CampaignTile.utils';
import { strings } from '../../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import useRewardsToast from '../../hooks/useRewardsToast';

export const CAMPAIGN_CTA_TEST_IDS = {
  CTA_BUTTON: 'campaign-details-cta-button',
} as const;

interface CampaignCTAProps {
  campaign: CampaignDto;
  participantStatus: Pick<
    UseGetCampaignParticipantStatusResult,
    'status' | 'isLoading'
  >;
  hasPositions: boolean;
}

/**
 * Bottom CTA for the Ondo campaign details page.
 * Renders one of four states depending on campaign/participant status:
 * - "Opt In" button when the user has not opted in and the deposit cutoff has not passed
 * - Disabled "Entries closed" button (with Lock icon + toast) when cutoff has passed
 * - "Open Position" button when the user has opted in but has no portfolio positions
 * - "Swap Ondo Assets" button when the user has opted in and has portfolio positions
 *
 * Only visible when the campaign status is 'active'.
 */
const CampaignCTA: React.FC<CampaignCTAProps> = ({
  campaign,
  participantStatus,
  hasPositions,
}) => {
  const [isOptInSheetOpen, setIsOptInSheetOpen] = useState(false);
  const navigation = useNavigation();
  const { showToast, RewardsToastOptions } = useRewardsToast();

  const onOpenPosition = useCallback(() => {
    navigation.navigate(Routes.WALLET.RWA_TOKENS_FULL_VIEW as never);
  }, [navigation]);
  const onSwapAssets = useCallback(() => {
    navigation.navigate(Routes.WALLET.RWA_TOKENS_FULL_VIEW as never);
  }, [navigation]);

  const isActive =
    !participantStatus?.isLoading &&
    participantStatus &&
    getCampaignStatus(campaign) === 'active';
  const isOptedIn = participantStatus?.status?.optedIn === true;
  const optinAllowed = isOptinAllowed(campaign);
  const isEntriesClosed = isActive && !isOptedIn && !optinAllowed;
  const hasShownEntriesToast = useRef(false);

  useEffect(() => {
    if (isEntriesClosed && !hasShownEntriesToast.current) {
      hasShownEntriesToast.current = true;
      showToast(
        RewardsToastOptions.entriesClosed(
          strings('rewards.campaign_details.entries_closed_title'),
          strings('rewards.campaign_details.entries_closed_description'),
        ),
      );
    }
  }, [isEntriesClosed, showToast, RewardsToastOptions]);

  if (!isActive) {
    return null;
  }

  if (isEntriesClosed) {
    return (
      <Box twClassName="px-4 pt-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled
          startIconName={IconName.Lock}
          testID={CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON}
        >
          {strings('rewards.campaign_details.entries_closed_title')}
        </Button>
      </Box>
    );
  }

  if (!isOptedIn) {
    return (
      <>
        <Box twClassName="px-4 pt-2">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={() => setIsOptInSheetOpen(true)}
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
  }

  if (hasPositions) {
    return (
      <Box twClassName="px-4 pt-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onSwapAssets}
          testID={CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON}
        >
          {strings('rewards.campaign_details.swap_ondo_assets')}
        </Button>
      </Box>
    );
  }

  return (
    <Box twClassName="px-4 pt-2">
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={onOpenPosition}
        testID={CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON}
      >
        {strings('rewards.campaign_details.open_position')}
      </Button>
    </Box>
  );
};

export default CampaignCTA;
