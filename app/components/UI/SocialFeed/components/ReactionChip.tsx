import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useEffect, useRef } from 'react';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';

export interface ReactionChipProps {
  emotion: string;
  count: number;
  testID?: string;
}

const POP_IN = ZoomIn.springify().damping(14).stiffness(240).duration(280);
const POP_OUT = ZoomOut.duration(140);
const SHIFT = LinearTransition.springify().damping(18).stiffness(220);

/**
 * One emoji + count in the engagement row. New chips pop in; count changes
 * bounce; removal shrinks out.
 */
const ReactionChip: React.FC<ReactionChipProps> = ({
  emotion,
  count,
  testID,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const skipCountBounce = useRef(true);

  useEffect(() => {
    if (skipCountBounce.current) {
      skipCountBounce.current = false;
      return;
    }
    if (prefersReducedMotion) {
      return;
    }
    scale.value = withSequence(
      withTiming(1.2, { duration: 90 }),
      withSpring(1, { damping: 12, stiffness: 240 }),
    );
  }, [count, prefersReducedMotion, scale]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={prefersReducedMotion ? FadeIn.duration(0) : POP_IN}
      exiting={prefersReducedMotion ? FadeOut.duration(0) : POP_OUT}
      layout={prefersReducedMotion ? undefined : SHIFT}
      style={bounceStyle}
      testID={testID}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
        twClassName="pl-2"
      >
        <Text variant={TextVariant.BodySm}>{emotion}</Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextMuted}>
          {count}
        </Text>
      </Box>
    </Animated.View>
  );
};

export default ReactionChip;
