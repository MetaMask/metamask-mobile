import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../../locales/i18n';
import {
  selectBalanceRefereePortion,
  selectReferralCode,
  selectReferralCount,
  selectReferralDetailsError,
  selectReferralDetailsLoading,
  selectSeasonStatusError,
  selectSeasonStartDate,
} from '../../../../../../../reducers/rewards/selectors';
import { useReferralDetails } from '../../../../hooks/useReferralDetails';
import RewardsErrorBanner from '../../../RewardsErrorBanner';
import ReferralStatsSection from '../../../ReferralDetails/ReferralStatsSection';
import { SeasonWayToEarnSpecificReferralDto } from '../../../../../../../core/Engine/controllers/rewards-controller/types';

const ReferralStatsSummary = ({
  referralPointsTitle,
  totalReferralsTitle,
}: Partial<SeasonWayToEarnSpecificReferralDto> = {}) => {
  const referralCode = useSelector(selectReferralCode);
  const refereeCount = useSelector(selectReferralCount);
  const balanceRefereePortion = useSelector(selectBalanceRefereePortion);
  const seasonStatusError = useSelector(selectSeasonStatusError);
  const seasonStartDate = useSelector(selectSeasonStartDate);
  const referralDetailsLoading = useSelector(selectReferralDetailsLoading);
  const referralDetailsError = useSelector(selectReferralDetailsError);

  const { fetchReferralDetails } = useReferralDetails();

  return (
    <Box twClassName="w-full">
      {seasonStatusError && !seasonStartDate ? (
        <RewardsErrorBanner
          title={strings('rewards.season_status_error.error_fetching_title')}
          description={strings(
            'rewards.season_status_error.error_fetching_description',
          )}
        />
      ) : !referralDetailsLoading && referralDetailsError && !referralCode ? (
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
        <ReferralStatsSection
          referralPointsTitle={referralPointsTitle}
          totalReferralsTitle={totalReferralsTitle}
          earnedPointsFromReferees={balanceRefereePortion}
          refereeCount={refereeCount}
          earnedPointsFromRefereesLoading={referralDetailsLoading}
          refereeCountLoading={referralDetailsLoading}
          refereeCountError={referralDetailsError}
        />
      )}
    </Box>
  );
};

export default ReferralStatsSummary;
