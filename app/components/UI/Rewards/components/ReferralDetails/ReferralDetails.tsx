import React from 'react';
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
  selectReferralDetailsLoading,
  selectSeasonStatusLoading,
} from '../../../../../reducers/rewards/selectors';
import { useReferralDetails } from '../../hooks/useReferralDetails';

const ReferralDetails: React.FC = () => {
  const referralCode = useSelector(selectReferralCode);
  const refereeCount = useSelector(selectReferralCount);
  const balanceRefereePortion = useSelector(selectBalanceRefereePortion);
  const seasonStatusLoading = useSelector(selectSeasonStatusLoading);
  const referralDetailsLoading = useSelector(selectReferralDetailsLoading);

  useReferralDetails();

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
        refereeCountLoading={referralDetailsLoading}
      />
      <ReferralActionsSection
        referralCode={referralCode}
        referralCodeLoading={referralDetailsLoading}
        onCopyCode={handleCopyCode}
        onCopyLink={handleCopyLink}
        onShareLink={handleShareLink}
      />
    </Box>
  );
};

export default ReferralDetails;
