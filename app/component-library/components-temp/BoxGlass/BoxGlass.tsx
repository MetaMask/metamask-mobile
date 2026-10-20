import React, { useMemo } from 'react';
import {
  PixelRatio,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { useLiquidGlass } from '../../hooks/useLiquidGlass';
import { useTheme } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';
import { colorWithOpacity } from '../../../util/colors/colorWithOpacity';

export const SHEEN_OPACITIES: Record<
  AppThemeKey.light | AppThemeKey.dark,
  number[]
> = {
  [AppThemeKey.dark]: [0.04, 0.1, 0.07],
  [AppThemeKey.light]: [0.075, 0.2, 0.1],
};
const SHEEN_LOCATIONS = [0, 0.5, 1];
const SHEEN_START = { x: 0.5, y: 0 };
const SHEEN_END = { x: 0, y: 1 };

const SHEEN_BORDER_WIDTH = PixelRatio.roundToNearestPixel(0.6);
const DARK_SHEEN_BORDER_OPACITY = 0.18;

export const GLASS_SURFACE_SHEEN_TEST_ID = 'glass-surface-sheen';
export const GLASS_SURFACE_SHEEN_GRADIENT_TEST_ID =
  'glass-surface-sheen-gradient';

export interface BoxGlassProps extends ViewProps {
  radiusClassName: `rounded-${string}`;
  /** Layout for the bordered outer wrapper, e.g. margins or flex. */
  containerStyle?: StyleProp<ViewStyle>;
  /** @deprecated No effect: CTA and banner surfaces no longer draw glass. */
  isInteractive?: boolean;
  /** Draws the brand refresh sheen: a muted gradient on the screen colour. */
  hasSheen?: boolean;
  /** The screen's flag; the surface turns opaque where the OS can't draw glass. */
  isGlass?: boolean;
}

type SurfaceProps = Omit<BoxGlassProps, 'isGlass'>;

const OpaqueSurface = ({
  radiusClassName,
  containerStyle,
  isInteractive: _isInteractive,
  hasSheen: _hasSheen,
  style,
  children,
  ...props
}: SurfaceProps) => {
  const tw = useTailwind();
  return (
    <View
      style={[tw.style('bg-muted', radiusClassName), containerStyle, style]}
      {...props}
    >
      {children}
    </View>
  );
};

const SheenSurface = ({
  radiusClassName,
  containerStyle,
  isInteractive: _isInteractive,
  hasSheen: _hasSheen,
  style,
  children,
  ...props
}: SurfaceProps) => {
  const tw = useTailwind();
  const { colors, themeAppearance } = useTheme();

  const sheenColors = useMemo(
    () =>
      SHEEN_OPACITIES[themeAppearance].map((opacity) =>
        colorWithOpacity(colors.background.muted, opacity),
      ),
    [colors.background.muted, themeAppearance],
  );
  const borderStyle = useMemo(
    () => ({
      borderWidth: SHEEN_BORDER_WIDTH,
      borderColor:
        themeAppearance === AppThemeKey.dark
          ? colorWithOpacity(colors.border.muted, DARK_SHEEN_BORDER_OPACITY)
          : colors.border.muted,
    }),
    [colors.border.muted, themeAppearance],
  );

  return (
    <View style={[tw.style(radiusClassName), borderStyle, containerStyle]}>
      <View
        style={[tw.style('overflow-hidden', radiusClassName), style]}
        {...props}
      >
        {/* The sheen tints are translucent, so they sit on the screen colour. */}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, tw.style('bg-default')]}
          testID={GLASS_SURFACE_SHEEN_TEST_ID}
        >
          <LinearGradient
            colors={sheenColors}
            locations={SHEEN_LOCATIONS}
            start={SHEEN_START}
            end={SHEEN_END}
            style={StyleSheet.absoluteFill}
            testID={GLASS_SURFACE_SHEEN_GRADIENT_TEST_ID}
          />
        </View>
        {children}
      </View>
    </View>
  );
};

/**
 * The brand refresh surface for CTAs and banners: the sheen gradient on the
 * screen colour, with a fine border. Glass is kept for elevated chrome such as
 * headers. Without a sheen, with `isGlass` off, or where the OS can't draw
 * glass, it is the opaque muted surface. `style` lays out the content on it.
 */
const BoxGlass = ({ isGlass = true, ...props }: BoxGlassProps) => {
  const { isGlassEnabled } = useLiquidGlass();
  return isGlass && isGlassEnabled && props.hasSheen ? (
    <SheenSurface {...props} />
  ) : (
    <OpaqueSurface {...props} />
  );
};

export default BoxGlass;
