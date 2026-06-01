import React, { forwardRef, useCallback } from 'react';
import type { StyleProp, View, ViewStyle } from 'react-native';
import {
  Pressable as RNGHPressable,
  type PressableStateCallbackType,
} from 'react-native-gesture-handler';

import { useTheme } from '../../../util/theme';

import type { PressableGHProps } from './Pressable.types';

/**
 * Gesture-handler variant of `Pressable`.
 *
 * Use this when the pressable lives inside a `react-native-gesture-handler`
 * scroll/list tree. Mixing RN core `Pressable` with RNGH scroll views
 * causes swipe/scroll gesture conflicts on Android.
 */
const PressableGH = forwardRef<View, PressableGHProps>(
  ({ style, accessibilityRole = 'button', children, ...props }, ref) => {
    const { colors } = useTheme();

    const composedStyle = useCallback(
      (state: PressableStateCallbackType): StyleProp<ViewStyle> => [
        typeof style === 'function' ? style(state) : style,
        state.pressed && { backgroundColor: colors.background.pressed },
      ],
      [style, colors.background.pressed],
    );

    return (
      <RNGHPressable
        ref={ref}
        accessibilityRole={accessibilityRole}
        {...props}
        style={composedStyle}
      >
        {children}
      </RNGHPressable>
    );
  },
);

PressableGH.displayName = 'PressableGH';

export default PressableGH;
