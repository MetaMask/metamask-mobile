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
  selectSeasonStatusError,
  selectSeasonStartDate,
} from '../../../../../reducers/rewards/selectors';
import { useReferralDetails } from '../../hooks/useReferralDetails';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { RewardsMetricsButtons } from '../../utils';

interface ReferralDetailsProps {
  showInfoSection?: boolean;
}

const ReferralDetails: React.FC<ReferralDetailsProps> = ({
  showInfoSection = true,
}) => {
  const referralCode = useSelector(selectReferralCode);
  const refereeCount = useSelector(selectReferralCount);
  const balanceRefereePortion = useSelector(selectBalanceRefereePortion);
  const seasonStatusError = useSelector(selectSeasonStatusError);
  const seasonStartDate = useSelector(selectSeasonStartDate);
  const referralDetailsLoading = useSelector(selectReferralDetailsLoading);
  const referralDetailsError = useSelector(selectReferralDetailsError);

  const { fetchReferralDetails } = useReferralDetails();

  const { trackEvent, createEventBuilder } = useMetrics();

  const handleCopyCode = async () => {
    if (referralCode) {
      Clipboard.setString(referralCode);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
          .addProperties({
            button_type: RewardsMetricsButtons.COPY_REFERRAL_CODE,
          })
          .build(),
      );
    }
  };

  const handleCopyLink = async (link: string) => {
    if (link) {
      Clipboard.setString(link);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
          .addProperties({
            button_type: RewardsMetricsButtons.COPY_REFERRAL_LINK,
          })
          .build(),
      );
    }
  };

  const handleShareLink = async (link: string) => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
        .addProperties({
          button_type: RewardsMetricsButtons.SHARE_REFERRAL_LINK,
        })
        .build(),
    );
    await Share.open({
      message: `${strings('rewards.referral.actions.share_referral_subject')}`,
      url: link,
    });
  };

  if (seasonStatusError && !seasonStartDate) {
    return (
      <RewardsErrorBanner
        title={strings('rewards.season_status_error.error_fetching_title')}
        description={strings(
          'rewards.season_status_error.error_fetching_description',
        )}
      />
    );
  }

  return (
    <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-4">
      {showInfoSection && <ReferralInfoSection />}

      {!referralDetailsLoading && referralDetailsError && !referralCode ? (
        <RewardsErrorBanner
          title={strings('rewards.referral_details_error.error_fetching_title')}
          description={strings(
            'rewards.referral_details_error.error_fetching_description',
          )}
          onConfirm={fetchReferralDetails}
          confirmButtonLabel={strings(
            'rewards.referral_details_error.retry_button',
          )}
        />
      ) : (
        <>
          <ReferralStatsSection
            earnedPointsFromReferees={balanceRefereePortion}
            refereeCount={refereeCount}
            earnedPointsFromRefereesLoading={referralDetailsLoading}
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
