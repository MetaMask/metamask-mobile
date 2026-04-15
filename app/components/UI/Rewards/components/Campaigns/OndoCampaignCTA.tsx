import React, { useCallback, useRef, useState } from 'react';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  IconName,
} from '@metamask/design-system-react-native';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import type { UseGetCampaignParticipantStatusResult } from '../../hooks/useGetCampaignParticipantStatus';
import { getCampaignStatus } from './CampaignTile.utils';
import { strings } from '../../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import useRewardsToast from '../../hooks/useRewardsToast';
import CampaignOptInCta, { CAMPAIGN_CTA_TEST_IDS } from './CampaignOptInCta';
import OndoNotEligibleSheet from './OndoNotEligibleSheet';

interface OndoCampaignCTAProps {
  campaign: CampaignDto;
  participantStatus: Pick<
    UseGetCampaignParticipantStatusResult,
    'status' | 'isLoading'
  >;
  hasPositions: boolean;
  campaignId: string;
  notEligibleForCampaign?: boolean;
}

/**
 * Bottom CTA for the Ondo campaign details page.
 * Renders one of four states depending on campaign/participant status:
 * - Delegates to CampaignCTA for the opt-in flow (active, not opted in, within deposit window)
 * - "Entries closed" button (with Lock icon + toast) when cutoff has passed and user is not opted in
 * - "Open Position" button when the user has opted in but has no portfolio positions
 * - "Swap Ondo Assets" button when the user has opted in and has portfolio positions
 */
const OndoCampaignCTA: React.FC<OndoCampaignCTAProps> = ({
  campaign,
  participantStatus,
  hasPositions,
  campaignId,
  notEligibleForCampaign = false,
}) => {
  const navigation = useNavigation();
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const [isNotEligibleSheetOpen, setIsNotEligibleSheetOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const navigateToOpenPosition = useCallback(() => {
    navigation.navigate(Routes.REWARDS_ONDO_CAMPAIGN_RWA_ASSET_SELECTOR, {
      mode: 'open_position',
      campaignId,
    });
  }, [navigation, campaignId]);

  const navigateToSwapAssets = useCallback(() => {
    navigation.navigate(Routes.REWARDS_ONDO_CAMPAIGN_RWA_ASSET_SELECTOR, {
      mode: 'swap',
      campaignId,
    });
  }, [navigation, campaignId]);

  const guardedNavigate = useCallback(
    (navigate: () => void) => {
      if (notEligibleForCampaign) {
        pendingActionRef.current = navigate;
        setIsNotEligibleSheetOpen(true);
        return;
      }
      navigate();
    },
    [notEligibleForCampaign],
  );

  const onOpenPosition = useCallback(
    () => guardedNavigate(navigateToOpenPosition),
    [guardedNavigate, navigateToOpenPosition],
  );

  const onSwapAssets = useCallback(
    () => guardedNavigate(navigateToSwapAssets),
    [guardedNavigate, navigateToSwapAssets],
  );

  const campaignStatus = getCampaignStatus(campaign);
  const isLoading = participantStatus.isLoading;
  const isOptedIn = participantStatus?.status?.optedIn === true;

  // Show "Entries closed" for complete campaigns when user has not opted in
  const isEntriesClosed =
    !isLoading && !isOptedIn && campaignStatus === 'complete';

  const handleEntriesClosedPress = useCallback(() => {
    showToast(
      RewardsToastOptions.entriesClosed(
        strings('rewards.campaign_details.ondo.entries_closed_title'),
        strings('rewards.campaign_details.ondo.entries_closed_description'),
      ),
    );
  }, [showToast, RewardsToastOptions]);

  if (isEntriesClosed) {
    return (
      <Box twClassName="px-4 pt-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          startIconName={IconName.Lock}
          onPress={handleEntriesClosedPress}
          testID={CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON}
        >
          {strings('rewards.campaign_details.ondo.entries_closed_title')}
        </Button>
      </Box>
    );
  }

  const isActive = !isLoading && campaignStatus === 'active';
  if (!isActive) {
    return null;
  }

  if (!isOptedIn) {
    if (notEligibleForCampaign) {
      return (
        <Box twClassName="px-4 pt-2">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleEntriesClosedPress}
            testID={CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON}
          >
            {strings('rewards.campaign_details.join_campaign')}
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
  }

  return (
    <>
      <Box twClassName="p-4 mb-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={hasPositions ? onSwapAssets : onOpenPosition}
          testID={CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON}
        >
          {hasPositions
            ? strings('rewards.campaign_details.swap_ondo_assets')
            : strings('rewards.campaign_details.open_position')}
        </Button>
      </Box>
      {isNotEligibleSheetOpen && (
        <OndoNotEligibleSheet
          onClose={() => setIsNotEligibleSheetOpen(false)}
          onConfirm={() => {
            setIsNotEligibleSheetOpen(false);
            pendingActionRef.current?.();
            pendingActionRef.current = null;
          }}
        />
      )}
    </>
  );
};

export default OndoCampaignCTA;
