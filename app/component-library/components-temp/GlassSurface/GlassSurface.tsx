import React, { useMemo } from 'react';
import {
  PixelRatio,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { GlassView } from 'expo-glass-effect';
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

export interface GlassSurfaceProps extends ViewProps {
  radiusClassName: `rounded-${string}`;
  /** Layout for the bordered outer wrapper, e.g. margins or flex. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Lets the glass react to touch; set it on pressable surfaces. */
  isInteractive?: boolean;
  /**
   * Covers the glass with the brand refresh sheen so the surface reads at
   * rest; the glass then shows in its press response. Glass alone renders
   * lighter than the sheen, so the sheen cannot sit behind it.
   */
  hasSheen?: boolean;
  isGlass?: boolean;
}

type SurfaceProps = Omit<GlassSurfaceProps, 'isGlass'>;

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

const LiquidGlassSurface = ({
  radiusClassName,
  containerStyle,
  isInteractive = false,
  hasSheen = false,
  style,
  children,
  ...props
}: SurfaceProps) => {
  const tw = useTailwind();
  const { colors, themeAppearance } = useTheme();
  const { glassColorScheme } = useLiquidGlass();

  const sheenColors = useMemo(
    () =>
      SHEEN_OPACITIES[themeAppearance].map((opacity) =>
        colorWithOpacity(colors.background.muted, opacity),
      ),
    [colors.background.muted, themeAppearance],
  );
  const borderStyle = useMemo(
    () =>
      hasSheen
        ? {
            borderWidth: SHEEN_BORDER_WIDTH,
            borderColor:
              themeAppearance === AppThemeKey.dark
                ? colorWithOpacity(
                    colors.border.muted,
                    DARK_SHEEN_BORDER_OPACITY,
                  )
                : colors.border.muted,
          }
        : { borderWidth: StyleSheet.hairlineWidth },
    [hasSheen, colors.border.muted, themeAppearance],
  );

  return (
    <View
      style={[
        tw.style('border-muted', radiusClassName),
        borderStyle,
        containerStyle,
      ]}
    >
      <GlassView
        glassEffectStyle="regular"
        colorScheme={glassColorScheme}
        isInteractive={isInteractive}
        // The native glass only takes the surface's corners when clipped.
        style={[tw.style('overflow-hidden', radiusClassName), style]}
        {...props}
      >
        {hasSheen && (
          // The sheen tints are translucent, so they sit on the screen colour.
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
        )}
        {children}
      </GlassView>
    </View>
  );
};

/**
 * An iOS 26 Liquid Glass surface with a hairline border, or the opaque muted
 * surface when `isGlass` is false. `style` lays out the content on it.
 */
const GlassSurface = ({ isGlass = true, ...props }: GlassSurfaceProps) =>
  isGlass ? <LiquidGlassSurface {...props} /> : <OpaqueSurface {...props} />;

export default GlassSurface;
