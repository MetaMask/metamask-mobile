import React from 'react';
import {
  Box,
  Icon,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import PreviousSeasonSummaryTile from './PreviousSeasonSummaryTile';
import {
  selectCurrentTier,
  selectSeasonId,
  selectSeasonStatusError,
  selectSeasonStatusLoading,
} from '../../../../../reducers/rewards/selectors';
import { useSelector } from 'react-redux';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

const PreviousSeasonLevel: React.FC = () => {
  const seasonId = useSelector(selectSeasonId);
  const seasonLoading = useSelector(selectSeasonStatusLoading);
  const seasonError = useSelector(selectSeasonStatusError);
  const currentTier = useSelector(selectCurrentTier);

  if (!seasonId || !currentTier || (seasonError && !seasonLoading)) {
    return null;
  }

  return (
    <PreviousSeasonSummaryTile
      twClassName="flex-col gap-3 flex-grow"
      isLoading={seasonLoading && !seasonId}
      loadingHeight={106}
      testID={REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_LEVEL}
    >
      {/* Tier Image */}
      <Box>
        <Icon name={IconName.Rocket} size={IconSize.Lg} />
      </Box>

      <Box twClassName="flex-col">
        <Text variant={TextVariant.HeadingSm} twClassName="text-default">
          {currentTier.levelNumber}
        </Text>
        <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
          {currentTier.name}
        </Text>
      </Box>
    </PreviousSeasonSummaryTile>
  );
};

export default PreviousSeasonLevel;
