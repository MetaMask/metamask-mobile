import React, { useCallback } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Pressable as RNGHPressable,
  type PressableStateCallbackType,
} from 'react-native-gesture-handler';

import { useTheme } from '../../../util/theme';

import type { PressableGHProps } from './Pressable.types';
import { getVariantColors } from './Pressable.utils';

/**
 * Gesture-handler variant of `Pressable`.
 *
 * Use this when the pressable lives inside a `react-native-gesture-handler`
 * scroll/list tree. Mixing RN core `Pressable` with RNGH scroll views causes
 * swipe/scroll gesture conflicts on Android.
 */
const PressableGH = ({
  variant = 'none',
  style,
  accessibilityRole = 'button',
  children,
  ...props
}: PressableGHProps) => {
  const { colors } = useTheme();
  const { resting, pressed } = getVariantColors(variant, colors);

  const composedStyle = useCallback(
    (state: PressableStateCallbackType): StyleProp<ViewStyle> => {
      const variantStyle: ViewStyle = {
        backgroundColor: state.pressed ? pressed : resting,
      };
      const callerStyle = typeof style === 'function' ? style(state) : style;
      return [variantStyle, callerStyle];
    },
    [resting, pressed, style],
  );

  return (
    <RNGHPressable
      accessibilityRole={accessibilityRole}
      {...props}
      style={composedStyle}
    >
      {children}
    </RNGHPressable>
  );
};

export default PressableGH;
