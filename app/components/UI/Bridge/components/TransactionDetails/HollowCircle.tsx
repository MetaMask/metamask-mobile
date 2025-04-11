import React from 'react';
import { Box } from '../../../Box/Box';
import { Display } from '../../../Box/box.types';
import {
  IconColor,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import { ThemeColors } from '@metamask/design-tokens';

const createStyles = (colors: ThemeColors, color?: IconColor) => {
  const borderColor =
    color === IconColor.Primary
      ? colors.primary.default
      : color === IconColor.Muted
      ? colors.icon.muted
      : colors.icon.default;
  return StyleSheet.create({
    hollowCircle: {
      height: 12,
      width: 12,
      borderWidth: 2,
      borderColor,
      borderRadius: 6,
      backgroundColor: colors.background.default,
      zIndex: 1,
    },
  });
};

interface HollowCircleProps {
  size?: IconSize;
  color?: IconColor;
  style?: StyleProp<ViewStyle>;
}

const HollowCircle = React.forwardRef<View, HollowCircleProps>(
  ({ color, style }, ref) => {
    const { colors } = useTheme();
    const styles = createStyles(colors, color);

    return (
      <Box
        ref={ref}
        display={Display.InlineBlock}
        style={[styles.hollowCircle, style]}
      />
    );
  },
);

export default HollowCircle;
