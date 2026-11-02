import {
  ButtonBase,
  ButtonBaseSize,
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
import { getHardwareTier } from '../../../../util/deviceCapability';

/**
 * The engagement-row pill: a hairline-outlined `ButtonBase`, shared by the
 * reaction chips and the add-reaction button so the row reads as one set.
 */
export const REACTION_PILL_TW_CLASS = 'bg-transparent border';

export interface ReactionChipProps {
  emotion: string;
  count: number;
  /** The viewer's own reaction: outlined a step stronger. */
  isSelected?: boolean;
  onPress?: () => void;
  testID?: string;
}

const POP_IN = ZoomIn.springify().damping(14).stiffness(240).duration(280);
const POP_OUT = ZoomOut.duration(140);
const SHIFT = LinearTransition.springify().damping(18).stiffness(220);

/**
 * One emoji + count in the engagement row. Tapping it toggles the viewer's
 * reaction to that emoji. New chips pop in; count changes bounce; removal
 * shrinks out.
 */
const ReactionChip: React.FC<ReactionChipProps> = ({
  emotion,
  count,
  isSelected = false,
  onPress,
  testID,
}) => {
  const prefersReducedMotion = useReducedMotion();
  // A pop per chip is cheap, but it is still motion a LOW device pays for on
  // every reaction in a scrolling list. Unknown hardware keeps the default.
  const isAnimated = !prefersReducedMotion && getHardwareTier() !== 'LOW';
  const scale = useSharedValue(1);
  const skipCountBounce = useRef(true);

  useEffect(() => {
    if (skipCountBounce.current) {
      skipCountBounce.current = false;
      return;
    }
    if (!isAnimated) {
      return;
    }
    scale.value = withSequence(
      withTiming(1.2, { duration: 90 }),
      withSpring(1, { damping: 12, stiffness: 240 }),
    );
  }, [count, isAnimated, scale]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={isAnimated ? POP_IN : FadeIn.duration(0)}
      exiting={isAnimated ? POP_OUT : FadeOut.duration(0)}
      layout={isAnimated ? SHIFT : undefined}
      style={bounceStyle}
    >
      <ButtonBase
        size={ButtonBaseSize.Sm}
        startAccessory={<Text variant={TextVariant.BodySm}>{emotion}</Text>}
        textProps={{
          variant: TextVariant.BodySm,
          color: TextColor.TextAlternative,
        }}
        twClassName={`${REACTION_PILL_TW_CLASS} px-2.5 ${
          isSelected ? 'border-default' : 'border-muted'
        }`}
        accessibilityState={{ selected: isSelected }}
        onPress={onPress}
        testID={testID}
      >
        {String(count)}
      </ButtonBase>
    </Animated.View>
  );
};

export default ReactionChip;
