import React from 'react';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import type { ReferralMeDto } from '../../../../../../core/Engine/controllers/rewards-money-controller/types';
import CampaignsPreview from '../../Campaigns/CampaignsPreview';
import BenefitsPreview from '../../Benefits/BenefitsPreview';
import RefererHeroCard from '../RefererHeroCard';
import RefereeHeroCard from '../RefereeHeroCard';
import RewardsOptInSection from '../RewardsOptInSection';

export const WAYS_TO_EARN_TAB_TEST_IDS = {
  CONTAINER: 'rewards-money-ways-to-earn-tab',
  CAMPAIGNS_SECTION: 'rewards-money-dashboard-campaigns-section',
  BENEFITS_SECTION: 'rewards-money-dashboard-benefits-section',
} as const;

export interface WaysToEarnTabProps {
  profileId: string;
  referralMe: ReferralMeDto;
  isSubscribed: boolean;
}

const WaysToEarnTab: React.FC<WaysToEarnTabProps> = ({
  profileId,
  referralMe,
  isSubscribed,
}) => (
  <Box testID={WAYS_TO_EARN_TAB_TEST_IDS.CONTAINER}>
    {referralMe.variant === 'REFERRER' ? (
      <RefererHeroCard
        profileId={profileId}
        referralCode={referralMe.referral_code}
        localizedText={referralMe.localized_text}
      />
    ) : null}
    {referralMe.variant === 'REFEREE' ? (
      <RefereeHeroCard
        profileId={profileId}
        referredBy={referralMe.referred_by}
        localizedText={referralMe.localized_text}
      />
    ) : null}
    {isSubscribed ? (
      <>
        <Box testID={WAYS_TO_EARN_TAB_TEST_IDS.CAMPAIGNS_SECTION}>
          <SectionDivider marginVertical={0} twClassName="mt-8 mb-5" />
          <CampaignsPreview />
        </Box>
        <Box testID={WAYS_TO_EARN_TAB_TEST_IDS.BENEFITS_SECTION}>
          <SectionDivider marginVertical={0} twClassName="mt-8 mb-5" />
          <BenefitsPreview />
        </Box>
      </>
    ) : (
      <RewardsOptInSection localizedText={referralMe.localized_text} />
    )}
  </Box>
);

export default WaysToEarnTab;
