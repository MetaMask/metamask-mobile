import React, { useEffect, useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
  interpolate,
  useAnimatedProps,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../../util/theme';
import {
  UNDO_WINDOW_MS,
  SWIPE_GAME_TEST_IDS,
} from '../../PredictSwipeGame.constants';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface UndoToastProps {
  isVisible: boolean;
  betType: 'yes' | 'no';
  marketTitle: string;
  betAmount: number;
  potentialWin: number;
  onUndo: () => void;
  onDismiss: () => void;
}

const CIRCLE_SIZE = 32;
const STROKE_WIDTH = 3;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * UndoToast - Toast notification with undo button and countdown
 *
 * Features:
 * - Shows bet confirmation message
 * - Circular progress countdown (5 seconds)
 * - Tap anywhere to undo and go back to previous card
 * - Auto-dismisses after countdown
 */
export const UndoToast: React.FC<UndoToastProps> = ({
  isVisible,
  betType,
  marketTitle,
  betAmount,
  potentialWin,
  onUndo,
  onDismiss,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  // Animation values
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(100);
  const progress = useSharedValue(0);

  // Handle countdown and auto-dismiss
  useEffect(() => {
    if (isVisible) {
      // Show toast
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.back(1.5)),
      });

      // Start countdown
      progress.value = 0;
      progress.value = withTiming(
        1,
        {
          duration: UNDO_WINDOW_MS,
          easing: Easing.linear,
        },
        (finished) => {
          if (finished) {
            runOnJS(onDismiss)();
          }
        },
      );
    } else {
      // Hide toast
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(100, { duration: 200 });
    }
  }, [isVisible, opacity, translateY, progress, onDismiss]);

  // Container animation style
  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // Circular progress animation
  const circleAnimatedProps = useAnimatedProps(() => {
    const strokeDashoffset = interpolate(
      progress.value,
      [0, 1],
      [CIRCUMFERENCE, 0],
    );
    return {
      strokeDashoffset,
    };
  });

  const handlePress = useCallback(() => {
    onUndo();
  }, [onUndo]);

  if (!isVisible) {
    return null;
  }

  const betColor =
    betType === 'yes' ? colors.success.default : colors.error.default;
  const betLabel = betType === 'yes' ? 'YES' : 'NO';

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Pressable
        onPress={handlePress}
        testID={SWIPE_GAME_TEST_IDS.UNDO_TOAST}
        style={({ pressed }) => [
          styles.toast,
          { backgroundColor: colors.background.default },
          pressed && { opacity: 0.9 },
        ]}
      >
        {/* Circular Progress Countdown */}
        <Box twClassName="mr-3">
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
            {/* Background circle */}
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke={colors.border.muted}
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
            />
            {/* Progress circle */}
            <AnimatedCircle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke={betColor}
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={circleAnimatedProps}
              strokeLinecap="round"
              transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
            />
          </Svg>
          <Box twClassName="absolute inset-0 items-center justify-center">
            <Text variant={TextVariant.BodySm}>↩</Text>
          </Box>
        </Box>

        {/* Bet info */}
        <Box twClassName="flex-1">
          <Box twClassName="flex-row items-center gap-1">
            <Text variant={TextVariant.BodyMdBold} style={{ color: betColor }}>
              {betLabel}
            </Text>
            <Text variant={TextVariant.BodyMd}>bet placed</Text>
          </Box>
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-muted"
            numberOfLines={1}
          >
            ${betAmount} on "{marketTitle}"
          </Text>
        </Box>

        {/* Undo button */}
        <Box
          twClassName="bg-muted rounded-full px-4 py-2"
          testID={SWIPE_GAME_TEST_IDS.UNDO_BUTTON}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
            Undo
          </Text>
        </Box>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default UndoToast;
