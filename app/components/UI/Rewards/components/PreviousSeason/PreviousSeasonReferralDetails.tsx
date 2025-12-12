import { strings } from '../../../../../../locales/i18n';
import { useReferralDetails } from '../../hooks/useReferralDetails';
import PreviousSeasonSummaryTile from './PreviousSeasonSummaryTile';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { useSelector } from 'react-redux';
import {
  selectBalanceRefereePortion,
  selectReferralCount,
  selectReferralDetailsLoading,
  selectReferralDetailsError,
  selectSeasonId,
} from '../../../../../reducers/rewards/selectors';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

const PreviousSeasonReferralDetails = () => {
  const { fetchReferralDetails } = useReferralDetails();
  const seasonId = useSelector(selectSeasonId);
  const totalReferees = useSelector(selectReferralCount);
  const referralPoints = useSelector(selectBalanceRefereePortion);
  const referralDetailsLoading = useSelector(selectReferralDetailsLoading);
  const referralDetailsError = useSelector(selectReferralDetailsError);

  if (!seasonId) {
    return null;
  }

  if (referralDetailsError && !referralDetailsLoading && !totalReferees) {
    return (
      <RewardsErrorBanner
        title={strings('rewards.referral_details_error.error_fetching_title')}
        description={strings(
          'rewards.referral_details_error.error_fetching_description',
        )}
        onConfirm={() => fetchReferralDetails()}
        confirmButtonLabel={strings(
          'rewards.referral_details_error.retry_button',
        )}
      />
    );
  }

  return (
    <PreviousSeasonSummaryTile
      twClassName="flex-col gap-2"
      isLoading={referralDetailsLoading}
      testID={REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_REFERRAL_DETAILS}
      loadingHeight={72}
    >
      <Box twClassName="flex-row gap-2 items-center">
        <Text
          twClassName="text-default"
          variant={TextVariant.BodyLg}
          fontWeight={FontWeight.Bold}
        >
          {totalReferees}
        </Text>
        <Text twClassName="text-alternative">
          {strings('rewards.referral_stats_referrals')?.toLowerCase()}
        </Text>
      </Box>

      <Box twClassName="flex-row gap-2 items-center">
        <Text
          twClassName="text-default"
          variant={TextVariant.BodyLg}
          fontWeight={FontWeight.Bold}
        >
          {referralPoints}
        </Text>
        <Text twClassName="text-alternative">
          {strings(
            'rewards.referral_stats_earned_from_referrals',
          )?.toLowerCase()}
        </Text>
      </Box>
    </PreviousSeasonSummaryTile>
  );
};

export default PreviousSeasonReferralDetails;
