import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import { BANNER_ACCENT, CARD_ACCENTS } from './constants';
import AnimatedGradientBorder from './components/AnimatedGradientBorder';
import { trackExploreCardsBannerTapped } from './utils/exploreCardsAnalytics';

/** Back → front fan of mini cards, each wearing a deck accent gradient. */
const MINI_CARDS: { rotation: number; colors: [string, string] }[] = [
  { rotation: -10, colors: CARD_ACCENTS.perp },
  { rotation: 0, colors: CARD_ACCENTS.trader },
  { rotation: 10, colors: CARD_ACCENTS.crypto },
];
const IDLE_OSCILLATION_DEG = 2;
const IDLE_OSCILLATION_DURATION_MS = 1600;
const BANNER_BORDER_RADIUS = 16;
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

/** Mini stacked-cards motif with a slow idle rotation oscillation. */
const MiniCardStack: React.FC = () => {
  const tw = useTailwind();
  const oscillation = useSharedValue(0);

  useEffect(() => {
    oscillation.value = withRepeat(
      withTiming(1, { duration: IDLE_OSCILLATION_DURATION_MS }),
      -1,
      true,
    );
  }, [oscillation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${(oscillation.value * 2 - 1) * IDLE_OSCILLATION_DEG}deg`,
      },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Box twClassName="w-14 h-14 items-center justify-center">
        {MINI_CARDS.map(({ rotation, colors }, index) => (
          <Box
            key={rotation}
            twClassName="absolute w-9 h-12 rounded-lg overflow-hidden items-center justify-center"
            style={tw.style({ transform: [{ rotate: `${rotation}deg` }] })}
          >
            <LinearGradient
              colors={colors}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={StyleSheet.absoluteFill}
            />
            {index === MINI_CARDS.length - 1 && (
              <Icon
                name={IconName.Sparkle}
                size={IconSize.Sm}
                color={IconColor.PrimaryInverse}
              />
            )}
          </Box>
        ))}
      </Box>
    </Animated.View>
  );
};

/**
 * Hero banner rendered as the first section of the Explore > Now tab — the
 * entry point into the swipeable Explore Cards deck. Wears the same animated
 * gradient border as the deck cards so the two surfaces feel related.
 */
const ExploreCardsBanner: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();

  const handlePress = useCallback(() => {
    trackExploreCardsBannerTapped();
    navigation.navigate(Routes.EXPLORE_CARDS);
  }, [navigation]);

  return (
    <Box twClassName="px-4 pt-2 pb-4">
      <AnimatedGradientBorder
        colors={BANNER_ACCENT}
        fill={false}
        borderRadius={BANNER_BORDER_RADIUS}
      >
        <Pressable
          onPress={handlePress}
          testID="explore-cards-banner"
          style={({ pressed }) =>
            tw.style(pressed ? 'bg-default-pressed' : 'bg-default')
          }
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="p-4 gap-4"
          >
            <MiniCardStack />
            <Box twClassName="flex-1">
              <Text
                variant={TextVariant.HeadingSm}
                fontWeight={FontWeight.Bold}
              >
                {strings('explore_cards.banner_title')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('explore_cards.banner_subtitle')}
              </Text>
            </Box>
            <Box twClassName="w-9 h-9 rounded-full bg-muted items-center justify-center">
              <Icon
                name={IconName.ArrowRight}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            </Box>
          </Box>
        </Pressable>
      </AnimatedGradientBorder>
    </Box>
  );
};

export default ExploreCardsBanner;
