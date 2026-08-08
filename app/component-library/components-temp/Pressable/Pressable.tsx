import React, { forwardRef, useCallback } from 'react';
import {
  Pressable as RNPressable,
  type PressableStateCallbackType,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../../../util/theme';

import { PressableVariant, type PressableProps } from './Pressable.types';

export const PRESSED_OPACITY = 0.7;

/**
 * Returns the pressed-state style overlay for the given variant. Exported
 * for direct testing of the per-variant feedback model.
 */
export const pressedStyleFor = (
  variant: PressableVariant,
  pressedBackgroundColor: string,
): ViewStyle => {
  switch (variant) {
    case PressableVariant.Highlight:
      return { backgroundColor: pressedBackgroundColor };
    case PressableVariant.None:
      return {};
    case PressableVariant.Default:
    default:
      return { opacity: PRESSED_OPACITY };
  }
};

/**
 * Design-system Pressable.
 *
 * Replaces `TouchableOpacity` across the app. The component supports two
 * visual feedback modes via the `variant` prop:
 *
 * `default` (the default) dims the caller's subtree by lowering opacity to
 * `PRESSED_OPACITY`. Mirrors the familiar `TouchableOpacity` model while
 * keeping content visible under pure-black mode.
 *
 * `highlight` composites `background.pressed` over the caller's resting
 * surface. Use for list rows, settings rows, and similar surfaces where a
 * backdrop highlight is the established design pattern.
 */
const Pressable = forwardRef<View, PressableProps>(
  (
    {
      style,
      accessibilityRole = 'button',
      children,
      variant = PressableVariant.Default,
      ...props
    },
    ref,
  ) => {
    const { colors } = useTheme();

    const composedStyle = useCallback(
      (state: PressableStateCallbackType): StyleProp<ViewStyle> => [
        typeof style === 'function' ? style(state) : style,
        state.pressed && pressedStyleFor(variant, colors.background.pressed),
      ],
      [style, colors.background.pressed, variant],
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
