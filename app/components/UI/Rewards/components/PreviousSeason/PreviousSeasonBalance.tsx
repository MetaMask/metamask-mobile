import React from 'react';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import MetamaskRewardsPointsAlternativeImage from '../../../../../images/rewards/metamask-rewards-points-alternative.svg';
import PreviousSeasonSummaryTile from './PreviousSeasonSummaryTile';
import { formatNumber } from '../../utils/formatUtils';
import { strings } from '../../../../../../locales/i18n';
import { useSelector } from 'react-redux';
import {
  selectSeasonId,
  selectSeasonStatusLoading,
  selectSeasonStatusError,
  selectBalanceTotal,
} from '../../../../../reducers/rewards/selectors';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

const PreviousSeasonBalance: React.FC = () => {
  const seasonId = useSelector(selectSeasonId);
  const seasonLoading = useSelector(selectSeasonStatusLoading);
  const seasonError = useSelector(selectSeasonStatusError);
  const balanceTotal = useSelector(selectBalanceTotal);

  if (!seasonId || (seasonError && !seasonLoading)) {
    return null;
  }

  return (
    <PreviousSeasonSummaryTile
      twClassName="flex-col gap-4 flex-grow"
      testID={REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_BALANCE}
      isLoading={seasonLoading && !seasonId}
      loadingHeight={106}
    >
      <Box twClassName="justify-center h-10 w-10">
        <MetamaskRewardsPointsAlternativeImage
          name="MetamaskRewardsPointsAlternative"
          height={25}
          width={25}
        />
      </Box>

      <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-2">
        <Text
          variant={TextVariant.BodyLg}
          fontWeight={FontWeight.Bold}
          twClassName="text-default"
        >
          {formatNumber(balanceTotal)}
        </Text>

        <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
          {!balanceTotal || balanceTotal > 1
            ? strings(
                'rewards.previous_season_summary.points_earned',
              ).toLowerCase()
            : strings(
                'rewards.previous_season_summary.point_earned',
              ).toLowerCase()}
        </Text>
      </Box>
    </PreviousSeasonSummaryTile>
  );
};

export default PreviousSeasonBalance;
