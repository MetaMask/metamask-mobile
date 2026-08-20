import React, { useCallback } from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import type { UseGetCampaignParticipantStatusResult } from '../../hooks/useGetCampaignParticipantStatus';
import { getCampaignStatus } from './CampaignTile.utils';
import { strings } from '../../../../../../locales/i18n';
import { selectPerpsEligibility } from '../../../Perps/selectors/perpsController';
import { useSelector } from 'react-redux';
import { handleDeeplink } from '../../../../../core/DeeplinkManager';
import CampaignOptInCta, { CAMPAIGN_CTA_TEST_IDS } from './CampaignOptInCta';

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
  const isPerpsEligible = useSelector(selectPerpsEligibility);

  const campaignStatus = getCampaignStatus(campaign);
  const isLoading = participantStatus.isLoading;
  const isOptedIn = participantStatus?.status?.optedIn === true;

  const handleOpenPosition = useCallback(async () => {
    await handleDeeplink({
      uri: 'https://link.metamask.io/perps?screen=market-list',
    });
  }, []);

  if (!isLoading && campaignStatus === 'active' && isOptedIn) {
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

  return (
    <CampaignOptInCta
      campaign={campaign}
      participantStatus={participantStatus}
      isFeatureGeoRestricted={!isPerpsEligible}
    />
  );
};

export default PerpsTradingCampaignCTA;
