import React, { useEffect } from 'react';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import ReferralInfoSection from './ReferralInfoSection';
import ReferralStatsSection from './ReferralStatsSection';
import ReferralActionsSection from './ReferralActionsSection';
import Share from 'react-native-share';
import { strings } from '../../../../../../locales/i18n';
import { useSelector } from 'react-redux';
import {
  selectBalanceRefereePortion,
  selectReferralCode,
  selectReferralCount,
  selectSeasonStatusLoading,
  selectSubscriptionId,
} from '../../../../../reducers/rewards/selectors';
import { useReferralDetails } from '../../hooks/useReferralDetails';

const ReferralDetails: React.FC = () => {
  const referralCode = useSelector(selectReferralCode);
  const refereeCount = useSelector(selectReferralCount);
  const balanceRefereePortion = useSelector(selectBalanceRefereePortion);
  const seasonStatusLoading = useSelector(selectSeasonStatusLoading);
  const subscriptionId = useSelector(selectSubscriptionId);

  const { fetchReferralDetails, isLoading: isReferralDetailsLoading } =
    useReferralDetails();

  // Fetch referral details when component mounts or subscription ID changes
  useEffect(() => {
    if (subscriptionId) {
      fetchReferralDetails();
    }
  }, [subscriptionId, fetchReferralDetails]);

  const handleCopyCode = async () => {
    if (referralCode) {
      Clipboard.setString(referralCode);
    }
  };

  const handleCopyLink = async (link: string) => {
    if (link) {
      Clipboard.setString(link);
    }
  };

  const handleShareLink = async (link: string) => {
    await Share.open({
      message: `${strings('rewards.referral.actions.share_referral_subject')}`,
      url: link,
    });
  };

  return (
    <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-8">
      <ReferralInfoSection />
      <ReferralStatsSection
        earnedPointsFromReferees={balanceRefereePortion}
        refereeCount={refereeCount}
        earnedPointsFromRefereesLoading={seasonStatusLoading}
        refereeCountLoading={isReferralDetailsLoading}
      />
      <ReferralActionsSection
        referralCode={referralCode}
        referralCodeLoading={isReferralDetailsLoading}
        onCopyCode={handleCopyCode}
        onCopyLink={handleCopyLink}
        onShareLink={handleShareLink}
      />
    </Box>
  );
};

export default ReferralDetails;
