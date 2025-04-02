import * as React from 'react';
import { BackgroundColor } from '../../../Box/box.types';
import { Box } from '../../../Box/Box';
import { Display } from '../../../Box/box.types';
import { IconColor, IconSize } from '../../../../../component-library/components/Icons/Icon';
import { View, StyleProp, ViewStyle } from 'react-native';

interface HollowCircleProps {
  size?: IconSize;
  color?: IconColor;
  style?: StyleProp<ViewStyle>;
}

const HollowCircle = React.forwardRef<View, HollowCircleProps>(
  ({ color, style }, ref) => {
    return (
      <Box
        ref={ref}
        display={Display.InlineBlock}
        style={[
          {
            height: 12,
            width: 12,
            borderWidth: 1,
            borderColor: `var(--color-${color})`,
            borderRadius: 6,
            backgroundColor: `var(--color-${BackgroundColor.backgroundDefault})`,
            zIndex: 1,
          },
          style,
        ]}
      />
    );
  },
);

export default HollowCircle;
