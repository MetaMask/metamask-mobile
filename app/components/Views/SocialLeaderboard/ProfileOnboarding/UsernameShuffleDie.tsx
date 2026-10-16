import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
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
import { useTheme } from '../../../../util/theme';

const DIE_SIZE = 20;

const JIGGLE_STEP = {
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
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
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handlePress = useCallback(() => {
    if (shouldJiggleDie(hardwareTier, networkTier)) {
      rotation.value = withSequence(
        withTiming(-16, { duration: 70, ...JIGGLE_STEP }),
        withTiming(14, { duration: 70, ...JIGGLE_STEP }),
        withTiming(-8, { duration: 60, ...JIGGLE_STEP }),
        withTiming(0, { duration: 80, ...JIGGLE_STEP }),
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
