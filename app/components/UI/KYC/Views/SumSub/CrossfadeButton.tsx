import React, { useEffect, useRef, useState } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion as useNativeReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Button,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

/** Each half of the label crossfade: the old label out, then the new one in. */
export const CROSSFADE_HALF_DURATION_MS = 120;

/** MMDS ButtonBase dims a disabled button to this opacity. */
const DISABLED_OPACITY = 0.5;

// Older Reanimated test mocks don't export the hook.
const useReducedMotion = useNativeReducedMotion ?? (() => false);

type CrossfadeButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  'children' | 'accessibilityLabel' | 'twClassName'
> & {
  /** The button's label. A change crossfades the visible text. */
  label: string;
};

/**
 * MMDS primary Button whose label crossfades when it changes, and whose
 * disabled dimming fades over the same time. The button keeps its size, so
 * nothing moves. The accessibility label updates straight away, and with
 * Reduce Motion on everything switches instantly.
 */
const CrossfadeButton = ({
  label,
  isDisabled,
  ...buttonProps
}: CrossfadeButtonProps) => {
  const reduceMotion = useReducedMotion();
  const [visibleLabel, setVisibleLabel] = useState(label);
  const visibleLabelRef = useRef(label);
  const labelOpacity = useSharedValue(1);
  const buttonOpacity = useSharedValue(isDisabled ? DISABLED_OPACITY : 1);

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
      labelOpacity.value = withTiming(1, {
        duration: CROSSFADE_HALF_DURATION_MS,
      });
      return undefined;
    }

    labelOpacity.value = withTiming(0, {
      duration: CROSSFADE_HALF_DURATION_MS,
    });
    const timeout = setTimeout(() => {
      showLabel();
      labelOpacity.value = withTiming(1, {
        duration: CROSSFADE_HALF_DURATION_MS,
      });
    }, CROSSFADE_HALF_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [label, reduceMotion, labelOpacity]);

  useEffect(() => {
    const target = isDisabled ? DISABLED_OPACITY : 1;
    if (reduceMotion) {
      cancelAnimation(buttonOpacity);
      buttonOpacity.value = target;
      return;
    }
    buttonOpacity.value = withTiming(target, {
      duration: CROSSFADE_HALF_DURATION_MS * 2,
    });
  }, [isDisabled, reduceMotion, buttonOpacity]);

  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }));
  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  return (
    <Animated.View style={buttonStyle}>
      <Button
        {...buttonProps}
        isDisabled={isDisabled}
        // The wrapper fades the disabled dimming, so the Button's own
        // opacity-50 step is turned off.
        twClassName="opacity-100"
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
    </Animated.View>
  );
};

export default CrossfadeButton;
