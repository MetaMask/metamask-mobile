import React, { useCallback, useMemo } from 'react';
import {
  Pressable as RNPressable,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../../../util/theme';

import type { PressableProps } from './Pressable.types';
import { getVariantColors } from './Pressable.utils';

/**
 * Design-system Pressable.
 *
 * Replaces `TouchableOpacity` across the app. Instead of dimming the entire
 * subtree on press (which made elevated surfaces look invisible against the
 * pure-black backdrop), this swaps the background color using the matching
 * pressed token for the chosen variant. Content stays fully opaque.
 *
 * See `./README.md` for the variant → token mapping.
 */
const Pressable = ({
  variant = 'none',
  style,
  accessibilityRole = 'button',
  children,
  ...props
}: PressableProps) => {
  const { colors } = useTheme();
  const { resting, pressed } = useMemo(
    () => getVariantColors(variant, colors),
    [variant, colors],
  );

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
