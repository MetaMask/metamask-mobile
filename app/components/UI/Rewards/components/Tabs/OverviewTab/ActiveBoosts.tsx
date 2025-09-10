import React, { useMemo } from 'react';
import { Dimensions, ScrollView, Image } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../util/theme';
import {
  selectActiveBoosts,
  selectActiveBoostsLoading,
} from '../../../../../../reducers/rewards/selectors';
import { PointsBoostDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../../locales/i18n';
import { AppThemeKey } from '../../../../../../util/theme/models';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.7; // 70% of screen width
const CARD_SPACING = 16;

interface BoostCardProps {
  boost: PointsBoostDto;
  index: number;
}

const BoostCard: React.FC<BoostCardProps> = ({ boost }) => {
  const tw = useTailwind();
  const { themeAppearance } = useTheme();

  // Get appropriate icon URL based on theme
  const iconUrl =
    themeAppearance === AppThemeKey.light
      ? boost.icon?.lightModeUrl
      : boost.icon?.darkModeUrl;

  return (
    <Box
      style={[
        tw.style('rounded-xl p-4 mr-4 h-32 relative'),
        {
          width: CARD_WIDTH,
          backgroundColor: boost.backgroundColor || tw.color('bg-default'),
        },
      ]}
    >
      <Box twClassName="grid-item col-span-3 flex flex-col justify-between h-full">
        {/* Boost Name */}
        <Text variant={TextVariant.HeadingSm} twClassName="text-white mb-2">
          {boost.name}
        </Text>

        {/* Badge */}
        <Box twClassName="mt-auto">
          {/* Season Long Badge */}
          {boost.seasonLong ? (
            <Box twClassName="flex-row items-center gap-2">
              <Icon
                name={IconName.Clock}
                size={IconSize.Sm}
                twClassName="text-white"
              />
              <Text variant={TextVariant.BodySm} twClassName="text-white">
                {strings('rewards.season_1')}
              </Text>
            </Box>
          ) : boost.endDate ? (
            <>
              {/* Time-limited Badge */}
              <Box twClassName="flex-row items-center gap-2">
                <Icon name={IconName.Clock} size={IconSize.Sm} />
                <Text variant={TextVariant.BodySm} twClassName="text-white">
                  {strings('rewards.limited_time')}
                </Text>
              </Box>
            </>
          ) : null}
        </Box>
      </Box>
      {/* Boost Icon */}
      {iconUrl && (
        <Box twClassName="absolute right-2 bottom-2">
          <Image
            source={{ uri: iconUrl }}
            resizeMode="contain"
            style={tw.style('h-16 w-16')}
          />
        </Box>
      )}
    </Box>
  );
};

const ActiveBoosts: React.FC = () => {
  const activeBoosts = useSelector(selectActiveBoosts) as PointsBoostDto[];
  const isLoading = useSelector(selectActiveBoostsLoading);

  const numBoosts = useMemo(() => activeBoosts.length, [activeBoosts]);

  if (isLoading || !numBoosts) {
    return null;
  }

  return (
    <Box twClassName="py-4">
      {/* Section Title */}
      <Box twClassName="mb-4">
        <Box twClassName="flex-row items-center gap-2 mb-1">
          <Text variant={TextVariant.HeadingMd} twClassName="text-default">
            {strings('rewards.active_boosts_title')}
          </Text>
          <Box twClassName="bg-text-muted rounded-full w-6 h-6 items-center justify-center">
            <Text variant={TextVariant.BodySm} twClassName="text-default">
              {numBoosts}
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Horizontal Scrollable Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="start"
      >
        {activeBoosts.map((boost: PointsBoostDto, index: number) => (
          <BoostCard key={boost.id} boost={boost} index={index} />
        ))}
      </ScrollView>
    </Box>
  );
};

export default ActiveBoosts;
