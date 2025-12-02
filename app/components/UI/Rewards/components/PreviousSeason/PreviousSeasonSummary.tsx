import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import React from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import {
  selectSeasonName,
  selectSeasonStatusError,
  selectSeasonStatusLoading,
} from '../../../../../reducers/rewards/selectors';
import PreviousSeasonBalance from './PreviousSeasonBalance';
import PreviousSeasonLevel from './PreviousSeasonLevel';
import PreviousSeasonReferralDetails from './PreviousSeasonReferralDetails';
import PreviousSeasonUnlockedRewards from './PreviousSeasonUnlockedRewards';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { useSeasonStatus } from '../../hooks/useSeasonStatus';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

const PreviousSeasonSummary = () => {
  const { fetchSeasonStatus } = useSeasonStatus({
    onlyForExplicitFetch: false,
  });
  const seasonName = useSelector(selectSeasonName);
  const seasonError = useSelector(selectSeasonStatusError);
  const seasonLoading = useSelector(selectSeasonStatusLoading);

  return (
    <Box
      twClassName="gap-4 p-4"
      testID={REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_SUMMARY}
    >
      <Text
        variant={TextVariant.HeadingMd}
        fontWeight={FontWeight.Bold}
        twClassName="text-default mb-2"
      >
        {strings('rewards.previous_season_summary.title', {
          seasonName: seasonName || '',
        })}
      </Text>

      {seasonError && !seasonLoading ? (
        <RewardsErrorBanner
          title={strings('rewards.season_error.error_fetching_title')}
          description={strings(
            'rewards.season_error.error_fetching_description',
          )}
          onConfirm={() => fetchSeasonStatus()}
          confirmButtonLabel={strings('rewards.season_error.retry_button')}
        />
      ) : (
        <>
          <Box twClassName="flex-row gap-4">
            <Box twClassName="flex-1">
              <PreviousSeasonBalance />
            </Box>

            <Box twClassName="flex-1">
              <PreviousSeasonLevel />
            </Box>
          </Box>

          <PreviousSeasonReferralDetails />

          <PreviousSeasonUnlockedRewards />
        </>
      )}
    </Box>
  );
};

export default PreviousSeasonSummary;
