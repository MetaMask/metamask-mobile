import React from 'react';
import type { StyleProp, ViewProps, ViewStyle } from 'react-native';
import { Box } from '@metamask/design-system-react-native';

import { useTheme } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';

export const GROUPED_SURFACE_TEST_ID = 'grouped-surface';

export interface GroupedSurfaceProps {
  children?: React.ReactNode;
  /** Radius utility, for example `rounded-xl` or `rounded-full`. */
  radiusClassName?: string;
  /** Extra utilities (padding, layout). The fill and stroke come from the role. */
  twClassName?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  onLayout?: ViewProps['onLayout'];
}

/**
 * L1 grouped surface. One treatment for content cards and in-content pills.
 *
 * Dark: 1px `border.muted` on `background.default`, with no muted fill.
 * Light: `background.section` fill. No sheen and no glass.
 */
const GroupedSurface = ({
  children,
  radiusClassName = 'rounded-xl',
  twClassName = '',
  style,
  testID = GROUPED_SURFACE_TEST_ID,
  onLayout,
}: GroupedSurfaceProps) => {
  const { themeAppearance } = useTheme();
  const tone =
    themeAppearance === AppThemeKey.dark
      ? 'border border-muted bg-default'
      : 'bg-section';

  return (
    <Box
      testID={testID}
      twClassName={`${radiusClassName} overflow-hidden ${tone} ${twClassName}`}
      style={style}
      onLayout={onLayout}
    >
      {children}
    </Box>
  );
};

export default GroupedSurface;
