import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { ReferralMeDto } from '../../../../../../core/Engine/controllers/rewards-money-controller/types';
import { moneyDashboardPersona } from '../../../../../../reducers/rewardsMoney/selectors';
import RefererHeroCard from '../RefererHeroCard';
import RefereeHeroCard from '../RefereeHeroCard';
import { WAYS_TO_EARN_TAB_TEST_IDS } from './WaysToEarnTab.testIds';

export interface WaysToEarnTabProps {
  profileId: string;
  referralMe: ReferralMeDto;
}

/**
 * First tab of the Rewards dashboard, labelled Overview. Campaigns and
 * benefits live in their own tabs.
 */
const WaysToEarnTab: React.FC<WaysToEarnTabProps> = ({
  profileId,
  referralMe,
}) => {
  const persona = moneyDashboardPersona(referralMe);
  return (
    <Box testID={WAYS_TO_EARN_TAB_TEST_IDS.CONTAINER}>
      {persona === 'referrer' ? (
        <RefererHeroCard
          profileId={profileId}
          referralCode={referralMe.referral_code}
          localizedText={referralMe.localized_text}
        />
      ) : null}
      {persona === 'referee' ? (
        <RefereeHeroCard
          profileId={profileId}
          referredBy={referralMe.referred_by}
          localizedText={referralMe.localized_text}
        />
      ) : null}
    </Box>
  );
};

export default WaysToEarnTab;
