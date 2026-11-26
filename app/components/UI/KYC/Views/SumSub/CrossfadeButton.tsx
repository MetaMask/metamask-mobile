import React, { useEffect, useRef, useState } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion as useNativeReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Button,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { AnimationDuration } from '@metamask/design-tokens';

/** Each half of the label crossfade: the old label out, then the new one in. */
export const CROSSFADE_HALF_DURATION_MS = AnimationDuration.Quickly;

const CROSSFADE_TIMING = {
  duration: CROSSFADE_HALF_DURATION_MS,
  easing: Easing.out(Easing.cubic),
};

// Older Reanimated test mocks don't export the hook.
const useReducedMotion = useNativeReducedMotion ?? (() => false);

type CrossfadeButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  | 'children'
  | 'accessibilityLabel'
  | 'variant'
  | 'isDanger'
  | 'isInverse'
  | 'textClassName'
> & {
  /** The button's label. A change crossfades the visible text. */
  label: string;
};

/**
 * MMDS primary Button whose label crossfades when it changes. The button keeps
 * its size, so nothing moves, and Button handles the disabled dimming itself.
 * The accessibility label updates straight away, and with Reduce Motion on the
 * label switches instantly.
 */
const CrossfadeButton = ({ label, ...buttonProps }: CrossfadeButtonProps) => {
  const reduceMotion = useReducedMotion();
  const [visibleLabel, setVisibleLabel] = useState(label);
  const visibleLabelRef = useRef(label);
  const labelOpacity = useSharedValue(1);

  useEffect(() => {
    const showLabel = () => {
      visibleLabelRef.current = label;
      setVisibleLabel(label);
    };

    if (reduceMotion) {
      cancelAnimation(labelOpacity);
      labelOpacity.value = 1;
      showLabel();
      return undefined;
    }
    if (label === visibleLabelRef.current) {
      // Back to the label already showing (e.g. mid-fade): just fade it in.
      labelOpacity.value = withTiming(1, CROSSFADE_TIMING);
      return undefined;
    }

    labelOpacity.value = withTiming(0, CROSSFADE_TIMING);
    const timeout = setTimeout(() => {
      showLabel();
      labelOpacity.value = withTiming(1, CROSSFADE_TIMING);
    }, CROSSFADE_HALF_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [label, reduceMotion, labelOpacity]);

  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }));

  return (
    <Button
      {...buttonProps}
      variant={ButtonVariant.Primary}
      accessibilityLabel={label}
    >
      <Animated.View style={labelStyle}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.PrimaryInverse}
          numberOfLines={1}
          twClassName="text-center"
        >
          {visibleLabel}
        </Text>
      </Animated.View>
    </Button>
  );
};

export default CrossfadeButton;
