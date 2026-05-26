import React, { useCallback } from 'react';
import {
  Pressable as RNPressable,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../../../util/theme';

import type { PressableProps } from './Pressable.types';
import { composePressableStyle } from './Pressable.utils';

/**
 * Design-system Pressable.
 *
 * Replaces `TouchableOpacity` across the app. Instead of dimming the
 * entire subtree on press, this applies the semi-transparent
 * `background.pressed` overlay on press. The overlay composites over
 * any resting background so callers don't need to pick a token pair
 * per surface.
 */
const Pressable = ({
  style,
  disableFeedback = false,
  accessibilityRole = 'button',
  children,
  ...props
}: PressableProps) => {
  const { colors } = useTheme();

  const composedStyle = useCallback(
    (state: PressableStateCallbackType): StyleProp<ViewStyle> =>
      composePressableStyle({
        state,
        callerStyle: style,
        disableFeedback,
        pressedColor: colors.background.pressed,
      }),
    [style, disableFeedback, colors.background.pressed],
  );

  return (
    <RNPressable
      accessibilityRole={accessibilityRole}
      {...props}
      style={composedStyle}
    >
      {children}
    </RNPressable>
  );
};

export default Pressable;
