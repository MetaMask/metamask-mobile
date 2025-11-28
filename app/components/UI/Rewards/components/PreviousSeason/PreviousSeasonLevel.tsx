import React from 'react';
import RewardsThemeImageComponent from '../ThemeImageComponent';
import {
  Box,
  Icon,
  IconName,
  IconSize,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { AppThemeKey } from '../../../../../util/theme/models';
import { useTheme } from '../../../../../util/theme';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
  const tw = useTailwind();
  const { themeAppearance, brandColors } = useTheme();
  const seasonId = useSelector(selectSeasonId);
  const seasonLoading = useSelector(selectSeasonStatusLoading);
  const seasonError = useSelector(selectSeasonStatusError);
  const currentTier = useSelector(selectCurrentTier);

  if (!seasonId || !currentTier || (seasonError && !seasonLoading)) {
    return null;
  }

  return (
    <PreviousSeasonSummaryTile
      twClassName="flex-col gap-2 flex-grow"
      isLoading={seasonLoading && !seasonId}
      loadingHeight={106}
      testID={REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_LEVEL}
    >
      {/* Tier Image */}
      <Box>
        {currentTier.image ? (
          <RewardsThemeImageComponent
            themeImage={currentTier.image}
            style={tw.style('h-12 w-12')}
          />
        ) : (
          <Box
            twClassName={`h-12 w-12 rounded-full bg-[${
              themeAppearance === AppThemeKey.light
                ? brandColors.grey100
                : brandColors.grey700
            }] items-center justify-center`}
          >
            <Icon
              name={IconName.Star}
              size={IconSize.Md}
              twClassName="text-icon-muted"
            />
          </Box>
        )}
      </Box>

      <Box twClassName="flex-col gap-2">
        <Text
          variant={TextVariant.BodyLg}
          fontWeight={FontWeight.Bold}
          twClassName="text-default"
        >
          {currentTier.levelNumber}
        </Text>
      </Box>

      {/* Tier Info */}
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        twClassName="text-alternative"
      >
        {currentTier.name}
      </Text>
    </PreviousSeasonSummaryTile>
  );
};

export default PreviousSeasonLevel;
