import React from 'react';
import type { StyleProp, ViewProps, ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';

import { useNetworkTier } from '../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../util/deviceCapability';
import { useTheme } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';
import { BLUR_INTENSITY } from '../../hooks/useBlurMaterial';
import { useLiquidGlass } from '../../hooks/useLiquidGlass';
import {
  ELEVATION_FILL,
  ElevationRole,
  resolveGlassMaterial,
  type ElevationRole as ElevationRoleName,
} from './elevation';

export interface ElevationSurfaceProps extends ViewProps {
  /** Which step of the ladder this container is. */
  role: ElevationRoleName;
  twClassName?: string;
  style?: StyleProp<ViewStyle>;
  /**
   * Lets Liquid Glass react to touch. Forced off when Reduce Motion is on.
   * Leave it off for a bar; set it on a single control.
   */
  isInteractive?: boolean;
  /** Blur strength for the iOS material fallback. Defaults to the shared chrome value. */
  blurIntensity?: number;
}

const OPAQUE_GLASS_CLASS = 'overflow-hidden border border-muted bg-section';

/**
 * One elevation container. Fill roles use design-system `Box` tokens.
 * The glass role uses Liquid Glass, then a system blur, then an opaque
 * section. Low-memory devices skip both translucent materials.
 *
 * Network tier is read and does not change the material. Blur is local.
 */
const GlassElevationSurface = ({
  twClassName = '',
  style,
  isInteractive = false,
  blurIntensity = BLUR_INTENSITY,
  children,
  ...props
}: Omit<ElevationSurfaceProps, 'role'>) => {
  const tw = useTailwind();
  const prefersReducedMotion = useReducedMotion() === true;
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const { isGlassEnabled, glassColorScheme, isBlurEnabled, blurTint } =
    useLiquidGlass();
  const material = resolveGlassMaterial({
    isGlassEnabled,
    isBlurEnabled,
    hardwareTier,
    networkTier,
  });
  const interactive = isInteractive && !prefersReducedMotion;
  const shape = [tw.style('overflow-hidden', twClassName), style];

  if (material === 'glass') {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={glassColorScheme}
        isInteractive={interactive}
        style={shape}
        {...props}
      >
        {children}
      </GlassView>
    );
  }

  if (material === 'blur') {
    return (
      <BlurView
        tint={blurTint}
        intensity={blurIntensity}
        style={shape}
        {...props}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <Box
      twClassName={`${OPAQUE_GLASS_CLASS} ${twClassName}`}
      style={style}
      {...props}
    >
      {children}
    </Box>
  );
};

const FillElevationSurface = ({
  role,
  twClassName = '',
  style,
  children,
  ...props
}: Omit<ElevationSurfaceProps, 'isInteractive' | 'blurIntensity'> & {
  role: Exclude<ElevationRoleName, 'glass'>;
}) => {
  const { themeAppearance, shadows } = useTheme();
  const spec = ELEVATION_FILL[role];
  const shadow =
    spec.shadow === 'lg'
      ? shadows.size.lg
      : spec.shadow === 'md-light' && themeAppearance === AppThemeKey.light
        ? shadows.size.md
        : undefined;

  return (
    <Box
      backgroundColor={spec.backgroundColor}
      borderColor={spec.borderColor}
      borderWidth={spec.borderWidth}
      twClassName={twClassName}
      style={[shadow, style]}
      {...props}
    >
      {children}
    </Box>
  );
};

const ElevationSurface = ({ role, ...props }: ElevationSurfaceProps) =>
  role === ElevationRole.Glass ? (
    <GlassElevationSurface {...props} />
  ) : (
    <FillElevationSurface role={role} {...props} />
  );

export default ElevationSurface;
