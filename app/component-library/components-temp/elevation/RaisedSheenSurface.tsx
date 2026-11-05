import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { useComponentSize } from '../../hooks/useComponentSize';
import { useTheme } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';
import { colorWithOpacity } from '../../../util/colors/colorWithOpacity';

export const RAISED_SHEEN_TEST_ID = 'raised-sheen-surface';
export const RAISED_SHEEN_GRADIENT_TEST_ID = 'raised-sheen-gradient';

/**
 * Highlight on a solid plate. Dark catches a white light on the top edge of
 * `background.section`. Light washes `background.muted` across white. Neither
 * stop is a glass refraction: there is no `GlassView` under this gradient.
 */
const PLATE_SHEEN_OPACITIES: Record<
  AppThemeKey.light | AppThemeKey.dark,
  number[]
> = {
  [AppThemeKey.dark]: [0.16, 0.07, 0.02],
  [AppThemeKey.light]: [0.05, 0.14, 0.06],
};

const SHEEN_LOCATIONS = [0, 0.45, 1];
const SHEEN_START = { x: 0.5, y: 0 };
const SHEEN_END = { x: 0.15, y: 1 };

export interface RaisedSheenSurfaceProps extends ViewProps {
  radiusClassName?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * L2 raised plate for the primary action row only.
 *
 * Opaque on purpose. Header capsules stay Liquid Glass with no fill, so a
 * solid `background.section` plate (dark) or white plate (light) plus this
 * sheen does not match them on `#000`.
 */
const RaisedSheenSurface = ({
  children,
  radiusClassName = 'rounded-2xl',
  style,
  testID = RAISED_SHEEN_TEST_ID,
  ...props
}: RaisedSheenSurfaceProps) => {
  const tw = useTailwind();
  const { colors, themeAppearance } = useTheme();
  const { size: sheenSize, onLayout: handleSheenLayout } = useComponentSize();
  const hasSheenSize = Boolean(sheenSize?.width && sheenSize?.height);
  const isDark = themeAppearance === AppThemeKey.dark;

  const sheenColors = useMemo(() => {
    const base = isDark ? colors.icon.default : colors.background.muted;
    return PLATE_SHEEN_OPACITIES[themeAppearance].map((opacity) =>
      colorWithOpacity(base, opacity),
    );
  }, [colors.background.muted, colors.icon.default, isDark, themeAppearance]);

  return (
    <View
      testID={testID}
      style={[
        tw.style(radiusClassName, 'overflow-hidden border border-muted'),
        {
          backgroundColor: isDark
            ? colors.background.section
            : colors.background.default,
        },
        style,
      ]}
      {...props}
    >
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        onLayout={handleSheenLayout}
      >
        {hasSheenSize ? (
          <LinearGradient
            key={`${sheenSize?.width}x${sheenSize?.height}`}
            colors={sheenColors}
            locations={SHEEN_LOCATIONS}
            start={SHEEN_START}
            end={SHEEN_END}
            style={StyleSheet.absoluteFill}
            testID={RAISED_SHEEN_GRADIENT_TEST_ID}
          />
        ) : null}
      </View>
      {children}
    </View>
  );
};

export default RaisedSheenSurface;
