import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../../util/theme';
import {
  DIMENSIONS,
  DEFAULT_GESTURE_CONFIG,
  SWIPE_GAME_TEST_IDS,
} from '../../PredictSwipeGame.constants';
import type { SwipeBetPreview } from '../../PredictSwipeGame.types';
import { formatPrice } from '../../../../utils/format';

const { SCREEN_WIDTH } = DIMENSIONS;
const { horizontalThreshold, verticalThreshold } = DEFAULT_GESTURE_CONFIG;

interface SwipeIndicatorsProps {
  translateX: Animated.SharedValue<number>;
  translateY: Animated.SharedValue<number>;
  yesPreview: SwipeBetPreview | null;
  noPreview: SwipeBetPreview | null;
  betAmount: number;
}

/**
 * SwipeIndicators - Shows Yes/No/Skip indicators on the sides of the card
 *
 * - YES indicator on the right (green) - appears when swiping right
 * - NO indicator on the left (red) - appears when swiping left
 * - SKIP indicator at the bottom - appears when swiping down
 */
export const SwipeIndicators: React.FC<SwipeIndicatorsProps> = ({
  translateX,
  translateY,
  yesPreview,
  noPreview,
  betAmount,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  // YES indicator (right side) - opacity based on swipe progress
  const yesIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, horizontalThreshold],
      [0, 1],
      Extrapolate.CLAMP,
    );
    const scale = interpolate(
      translateX.value,
      [0, horizontalThreshold],
      [0.8, 1],
      Extrapolate.CLAMP,
    );
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  // NO indicator (left side) - opacity based on swipe progress
  const noIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, -horizontalThreshold],
      [0, 1],
      Extrapolate.CLAMP,
    );
    const scale = interpolate(
      translateX.value,
      [0, -horizontalThreshold],
      [0.8, 1],
      Extrapolate.CLAMP,
    );
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  // SKIP indicator (bottom) - opacity based on swipe progress
  const skipIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, verticalThreshold],
      [0, 1],
      Extrapolate.CLAMP,
    );
    const scale = interpolate(
      translateY.value,
      [0, verticalThreshold],
      [0.8, 1],
      Extrapolate.CLAMP,
    );
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const potentialYesWin = yesPreview?.potentialWin ?? 0;
  const potentialNoWin = noPreview?.potentialWin ?? 0;

  return (
    <>
      {/* YES Indicator - Right Side */}
      <Animated.View
        style={[styles.yesIndicator, yesIndicatorStyle]}
        testID={SWIPE_GAME_TEST_IDS.YES_INDICATOR}
      >
        <Box
          twClassName="bg-success-default rounded-2xl px-5 py-4 items-center"
          style={styles.indicatorShadow}
        >
          <Text
            variant={TextVariant.HeadingLg}
            style={{ color: colors.primary.inverse }}
          >
            ✓ YES
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            style={{ color: colors.primary.inverse }}
          >
            Bet ${betAmount}
          </Text>
          {potentialYesWin > 0 && (
            <Text
              variant={TextVariant.BodySm}
              style={{ color: colors.primary.inverse, opacity: 0.8 }}
            >
              Win ${formatPrice(potentialYesWin + betAmount)}
            </Text>
          )}
        </Box>
      </Animated.View>

      {/* NO Indicator - Left Side */}
      <Animated.View
        style={[styles.noIndicator, noIndicatorStyle]}
        testID={SWIPE_GAME_TEST_IDS.NO_INDICATOR}
      >
        <Box
          twClassName="bg-error-default rounded-2xl px-5 py-4 items-center"
          style={styles.indicatorShadow}
        >
          <Text
            variant={TextVariant.HeadingLg}
            style={{ color: colors.primary.inverse }}
          >
            ✗ NO
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            style={{ color: colors.primary.inverse }}
          >
            Bet ${betAmount}
          </Text>
          {potentialNoWin > 0 && (
            <Text
              variant={TextVariant.BodySm}
              style={{ color: colors.primary.inverse, opacity: 0.8 }}
            >
              Win ${formatPrice(potentialNoWin + betAmount)}
            </Text>
          )}
        </Box>
      </Animated.View>

      {/* SKIP Indicator - Bottom */}
      <Animated.View
        style={[styles.skipIndicator, skipIndicatorStyle]}
        testID={SWIPE_GAME_TEST_IDS.SKIP_INDICATOR}
      >
        <Box
          twClassName="bg-muted rounded-2xl px-5 py-3 items-center"
          style={styles.indicatorShadow}
        >
          <Text variant={TextVariant.BodyLg}>⏭️ SKIP</Text>
        </Box>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  yesIndicator: {
    position: 'absolute',
    right: 20,
    top: '40%',
    zIndex: 10,
  },
  noIndicator: {
    position: 'absolute',
    left: 20,
    top: '40%',
    zIndex: 10,
  },
  skipIndicator: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    zIndex: 10,
  },
  indicatorShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default SwipeIndicators;

