import React, { forwardRef, useCallback } from 'react';
import {
  Pressable as RNPressable,
  type PressableStateCallbackType,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../../../util/theme';

import type { PressableProps } from './Pressable.types';

/**
 * Design-system Pressable.
 *
 * Replaces `TouchableOpacity` across the app. Instead of dimming the
 * entire subtree on press, this layers the semi-transparent
 * `background.pressed` token on top of whatever resting surface the
 * parent owns. The component itself never sets a resting background.
 */
const Pressable = forwardRef<View, PressableProps>(
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
      <RNPressable
        ref={ref}
        accessibilityRole={accessibilityRole}
        {...props}
        style={composedStyle}
      >
        {children}
      </RNPressable>
    );
  },
);

Pressable.displayName = 'Pressable';

export default Pressable;
