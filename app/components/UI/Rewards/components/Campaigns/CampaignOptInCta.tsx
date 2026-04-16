import React, { useCallback, useState } from 'react';
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
import { getCampaignStatus } from './CampaignTile.utils';
import { strings } from '../../../../../../locales/i18n';
import useCampaignGeoRestriction from '../../hooks/useCampaignGeoRestriction';
import useRewardsToast from '../../hooks/useRewardsToast';

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
  /** An optional set of country codes that are restricted independently of the campaign's `excludedRegions`. Checked before `excludedRegions`. When the user's country matches this list the CTA shows "Check eligibility" and a geo-locked toast instead of opening the opt-in sheet. */
  customRestrictedCountries?: Set<string>;
}

/**
 * General campaign opt-in CTA.
 * When the user is geo-restricted: shows an enabled "Check eligibility" button (lock icon) that fires a "not available in your region" toast.
 * Otherwise: shows a "Join Campaign" button that opens the opt-in sheet.
 * Returns null when the campaign is not active or the user is already opted in.
 */
const CampaignOptInCta: React.FC<CampaignOptInCtaProps> = ({
  campaign,
  participantStatus,
  onJoinPress,
  customRestrictedCountries,
}) => {
  const [isOptInSheetOpen, setIsOptInSheetOpen] = useState(false);
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const { isGeoRestricted, isGeoLoading } = useCampaignGeoRestriction(
    campaign,
    customRestrictedCountries,
  );

  const campaignStatus = getCampaignStatus(campaign);
  const isLoading = participantStatus.isLoading;
  const isOptedIn = participantStatus?.status?.optedIn === true;

  const isActive = !isLoading && campaignStatus === 'active';

  const handleGeoLockedPress = useCallback(() => {
    showToast(
      RewardsToastOptions.entriesClosed(
        strings('rewards.campaign.geo_locked_toast_title'),
        strings('rewards.campaign.geo_locked_toast_description'),
      ),
    );
  }, [showToast, RewardsToastOptions]);

  if (!isActive || isOptedIn) {
    return null;
  }

  if (isGeoRestricted) {
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
          {strings('rewards.campaign_details.geo_locked_cta')}
        </Button>
      </Box>
    );
  }

  return (
    <>
      <Box twClassName="p-4 mb-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={isGeoLoading}
          loadingText={strings('rewards.campaign_details.geo_loading')}
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
