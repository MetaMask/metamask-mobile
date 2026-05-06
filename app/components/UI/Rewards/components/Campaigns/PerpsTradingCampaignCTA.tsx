import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
} from '@metamask/design-system-react-native';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import type { UseGetCampaignParticipantStatusResult } from '../../hooks/useGetCampaignParticipantStatus';
import { getCampaignStatus } from './CampaignTile.utils';
import { strings } from '../../../../../../locales/i18n';
import CampaignOptInSheet from './CampaignOptInSheet';
import { CAMPAIGN_CTA_TEST_IDS } from './CampaignOptInCta';
import { selectPerpsEligibility } from '../../../Perps/selectors/perpsController';
import { useSelector } from 'react-redux';
import useRewardsToast from '../../hooks/useRewardsToast';
import { handleDeeplink } from '../../../../../core/DeeplinkManager';

interface PerpsTradingCampaignCTAProps {
  campaign: CampaignDto;
  participantStatus: Pick<
    UseGetCampaignParticipantStatusResult,
    'status' | 'isLoading'
  >;
}

const PerpsTradingCampaignCTA: React.FC<PerpsTradingCampaignCTAProps> = ({
  campaign,
  participantStatus,
}) => {
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const isPerpsEligible = useSelector(selectPerpsEligibility);
  const [isOptInSheetOpen, setIsOptInSheetOpen] = useState(false);

  const campaignStatus = getCampaignStatus(campaign);
  const isLoading = participantStatus.isLoading;
  const isOptedIn = participantStatus?.status?.optedIn === true;

  const handleGeoLockedPress = useCallback(() => {
    showToast(
      RewardsToastOptions.entriesClosed(
        strings('rewards.campaign.geo_locked_toast_title'),
        strings('rewards.campaign.geo_locked_toast_description'),
      ),
    );
  }, [showToast, RewardsToastOptions]);

  const handleJoinPress = useCallback(() => {
    setIsOptInSheetOpen(true);
  }, []);

  const handleOpenPosition = useCallback(async () => {
    await handleDeeplink({
      uri: 'https://link.metamask.io/perps?screen=market-list',
    });
  }, []);

  if (isLoading) {
    return null;
  }

  // Campaign complete — no CTA (leaderboard section handles it)
  if (campaignStatus === 'complete') {
    return null;
  }

  if (campaignStatus !== 'active') {
    return null;
  }

  // Opted in — show "Open Position"
  if (isOptedIn) {
    return (
      <Box twClassName="p-4 mb-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleOpenPosition}
          testID={CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON}
        >
          {strings('rewards.perps_trading_campaign.open_position_cta')}
        </Button>
      </Box>
    );
  }

  // Not opted in — geo-restricted
  if (!isPerpsEligible) {
    return (
      <Box twClassName="p-4 mb-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          startIconName={IconName.Lock}
          onPress={handleGeoLockedPress}
          testID={CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON}
        >
          {strings('rewards.campaign.geo_locked_cta')}
        </Button>
      </Box>
    );
  }

  // Not opted in — eligible
  return (
    <>
      <Box twClassName="p-4 mb-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleJoinPress}
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

export default PerpsTradingCampaignCTA;
