import * as React from 'react';
import { Box } from '../../../Box/Box';
import { Display } from '../../../Box/box.types';
import { IconColor, IconSize } from '../../../../../component-library/components/Icons/Icon';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../../../../util/theme';

interface HollowCircleProps {
  size?: IconSize;
  color?: IconColor;
  style?: StyleProp<ViewStyle>;
}

const HollowCircle = React.forwardRef<View, HollowCircleProps>(
  ({ color, style }, ref) => {
    const { colors } = useTheme();
    const borderColor = color === IconColor.Primary ? colors.primary.default : colors.icon.muted;

    return (
      <Box
        ref={ref}
        display={Display.InlineBlock}
        style={[
          {
            height: 12,
            width: 12,
            borderWidth: 2,
            borderColor,
            borderRadius: 6,
            backgroundColor: colors.background.default,
            zIndex: 1,
          },
          style,
        ]}
      />
    );
  },
);

export default HollowCircle;
