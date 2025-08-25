import React, { useEffect } from 'react';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import ReferralInfoSection from './ReferralInfoSection';
import ReferralStatsSection from './ReferralStatsSection';
import ReferralActionsSection from './ReferralActionsSection';
import { useRewardsStore, useReferralDetails } from '../../hooks';
import Share from 'react-native-share';
import { strings } from '../../../../../../locales/i18n';

const ReferralDetails: React.FC = () => {
  const { referralDetails, subscription } = useRewardsStore();
  const { fetchReferralDetails, isLoading: isReferralDetailsLoading } =
    useReferralDetails();

  // Fetch referral details when component mounts or subscription ID changes
  useEffect(() => {
    if (subscription.subscriptionId) {
      fetchReferralDetails();
    }
  }, [subscription.subscriptionId, fetchReferralDetails]);

  const handleCopyCode = async () => {
    if (referralDetails.referralCode) {
      Clipboard.setString(referralDetails.referralCode);
    }
  };

  const handleCopyLink = async (link: string) => {
    if (link) {
      Clipboard.setString(link);
    }
  };

  const handleShareLink = async (link: string) => {
    await Share.open({
      subject: `${strings('rewards.referral.actions.share_referral_subject')}`,
      url: link,
    });
  };

  return (
    <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-8">
      <ReferralInfoSection />
      <ReferralStatsSection
        earnedPointsFromReferees={referralDetails.earnedPointsFromReferees || 0}
        refereeCount={referralDetails.refereeCount || 0}
        earnedPointsFromRefereesLoading={false} // fetched when UI state is ready
        refereeCountLoading={isReferralDetailsLoading}
      />
      <ReferralActionsSection
        referralCode={referralDetails.referralCode || ''}
        onCopyCode={handleCopyCode}
        onCopyLink={handleCopyLink}
        onShareLink={handleShareLink}
      />
      {/* TODO: Display an error state UI if referralDetailsError is present */}
    </Box>
  );
};

export default ReferralDetails;
