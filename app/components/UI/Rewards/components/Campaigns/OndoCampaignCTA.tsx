import React, { useCallback } from 'react';
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

interface OndoCampaignCTAProps {
  campaign: CampaignDto;
  participantStatus: Pick<
    UseGetCampaignParticipantStatusResult,
    'status' | 'isLoading'
  >;
  hasPositions: boolean;
  campaignId: string;
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
}) => {
  const navigation = useNavigation();
  const { showToast, RewardsToastOptions } = useRewardsToast();

  const onOpenPosition = useCallback(() => {
    navigation.navigate(Routes.REWARDS_ONDO_CAMPAIGN_RWA_ASSET_SELECTOR, {
      mode: 'open_position',
      campaignId,
    });
  }, [navigation, campaignId]);

  const onSwapAssets = useCallback(() => {
    navigation.navigate(Routes.REWARDS_ONDO_CAMPAIGN_RWA_ASSET_SELECTOR, {
      mode: 'swap',
      campaignId,
    });
  }, [navigation, campaignId]);

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
    return (
      <CampaignOptInCta
        campaign={campaign}
        participantStatus={participantStatus}
      />
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
          {strings('rewards.campaign_details.ondo.open_position')}
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
        {strings('rewards.campaign_details.ondo.open_position')}
      </Button>
    </Box>
  );
};

export default OndoCampaignCTA;
