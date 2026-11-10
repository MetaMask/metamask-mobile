import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Rect } from 'react-native-svg';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import type {
  HardwareTier,
  NetworkTier,
} from '../../../../util/deviceCapability/types';
import { playSelection } from '../../../../util/haptics';
import { useTheme } from '../../../../util/theme';

const DIE_SIZE = 20;

/**
 * Jiggle beats in ms. Selection clicks fire at the start of the first three so
 * the die rattles in the hand as well as on screen.
 */
export const JIGGLE_BEAT_MS = [70, 70, 60, 80] as const;
export const SHUFFLE_HAPTIC_CLICKS = 3;

const JIGGLE_STEP = {
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};

/**
 * Three picker clicks timed to the jiggle. Returns a cancel function so a
 * second tap can restart the roll instead of stacking overlapping rattles.
 */
export const scheduleShuffleUsernameHaptics = (): (() => void) => {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let elapsed = 0;
  for (let i = 0; i < SHUFFLE_HAPTIC_CLICKS; i++) {
    const delay = elapsed;
    timers.push(
      setTimeout(() => {
        playSelection().catch(() => undefined);
      }, delay),
    );
    elapsed += JIGGLE_BEAT_MS[i];
  }
  return () => {
    timers.forEach(clearTimeout);
  };
};

/**
 * A one-shot shake is light animation. Skip it only on a low-end device that
 * is also on slow cellular, where the matrix asks for less animation.
 */
const shouldJiggleDie = (
  hardware: HardwareTier | null,
  network: NetworkTier | null,
): boolean => hardware !== 'LOW' || network !== 'SLOW_CELLULAR';

interface UsernameShuffleDieProps {
  onPress: () => void;
  accessibilityLabel: string;
  testID: string;
}

const UsernameShuffleDie: React.FC<UsernameShuffleDieProps> = ({
  onPress,
  accessibilityLabel,
  testID,
}) => {
  const { colors } = useTheme();
  const tw = useTailwind();
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const rotation = useSharedValue(0);
  const cancelShuffleHaptics = useRef<(() => void) | null>(null);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(
    () => () => {
      cancelShuffleHaptics.current?.();
    },
    [],
  );

  const handlePress = useCallback(() => {
    cancelShuffleHaptics.current?.();
    cancelShuffleHaptics.current = scheduleShuffleUsernameHaptics();
    if (shouldJiggleDie(hardwareTier, networkTier)) {
      rotation.value = withSequence(
        withTiming(-16, { duration: JIGGLE_BEAT_MS[0], ...JIGGLE_STEP }),
        withTiming(14, { duration: JIGGLE_BEAT_MS[1], ...JIGGLE_STEP }),
        withTiming(-8, { duration: JIGGLE_BEAT_MS[2], ...JIGGLE_STEP }),
        withTiming(0, { duration: JIGGLE_BEAT_MS[3], ...JIGGLE_STEP }),
      );
    }
    onPress();
  }, [hardwareTier, networkTier, onPress, rotation]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={handlePress}
      testID={testID}
      style={tw.style('items-center justify-center')}
    >
      <Animated.View style={animatedStyle}>
        <Svg width={DIE_SIZE} height={DIE_SIZE} viewBox="0 0 20 20" fill="none">
          <Rect
            x="2.25"
            y="2.25"
            width="15.5"
            height="15.5"
            rx="3.5"
            stroke={colors.icon.default}
            strokeWidth={1.5}
          />
          <Circle cx="6.5" cy="6.5" r="1.15" fill={colors.icon.default} />
          <Circle cx="13.5" cy="6.5" r="1.15" fill={colors.icon.default} />
          <Circle cx="10" cy="10" r="1.15" fill={colors.icon.default} />
          <Circle cx="6.5" cy="13.5" r="1.15" fill={colors.icon.default} />
          <Circle cx="13.5" cy="13.5" r="1.15" fill={colors.icon.default} />
        </Svg>
      </Animated.View>
    </Pressable>
  );
};

export default UsernameShuffleDie;
