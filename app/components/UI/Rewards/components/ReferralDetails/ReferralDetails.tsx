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
  selectReferralDetailsError,
  selectReferralDetailsLoading,
  selectSeasonStatusLoading,
  selectSeasonStatusError,
  selectSeasonStartDate,
} from '../../../../../reducers/rewards/selectors';
import { useReferralDetails } from '../../hooks/useReferralDetails';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const ReferralDetails: React.FC = () => {
  const tw = useTailwind();
  const referralCode = useSelector(selectReferralCode);
  const refereeCount = useSelector(selectReferralCount);
  const balanceRefereePortion = useSelector(selectBalanceRefereePortion);
  const seasonStatusLoading = useSelector(selectSeasonStatusLoading);
  const seasonStatusError = useSelector(selectSeasonStatusError);
  const seasonStartDate = useSelector(selectSeasonStartDate);
  const referralDetailsLoading = useSelector(selectReferralDetailsLoading);
  const referralDetailsError = useSelector(selectReferralDetailsError);

  const { fetchReferralDetails } = useReferralDetails();

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

  if (seasonStatusError && !seasonStartDate) {
    return (
      <BannerAlert
        severity={BannerAlertSeverity.Error}
        title={strings('rewards.season_status_error.error_fetching_title')}
        description={strings(
          'rewards.season_status_error.error_fetching_description',
        )}
      />
    );
  }

  return (
    <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-4">
      <ReferralInfoSection />

      {!referralDetailsLoading && referralDetailsError && !referralCode ? (
        <BannerAlert
          severity={BannerAlertSeverity.Error}
          title={strings('rewards.referral_details_error.error_fetching_title')}
          description={strings(
            'rewards.referral_details_error.error_fetching_description',
          )}
          actionButtonProps={{
            size: ButtonSize.Md,
            style: tw.style('mt-2'),
            onPress: fetchReferralDetails,
            label: strings('rewards.referral_details_error.retry_button'),
            variant: ButtonVariants.Primary,
          }}
        />
      ) : (
        <>
          <ReferralStatsSection
            earnedPointsFromReferees={balanceRefereePortion}
            refereeCount={refereeCount}
            earnedPointsFromRefereesLoading={seasonStatusLoading}
            refereeCountLoading={referralDetailsLoading}
            refereeCountError={referralDetailsError}
          />

          <ReferralActionsSection
            referralCode={referralCode}
            referralCodeLoading={referralDetailsLoading}
            referralCodeError={referralDetailsError}
            onCopyCode={handleCopyCode}
            onCopyLink={handleCopyLink}
            onShareLink={handleShareLink}
          />
        </>
      )}
    </Box>
  );
};

export default ReferralDetails;
