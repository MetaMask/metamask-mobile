import { useState } from 'react';
import {
  isLiquidGlassAvailable,
  type GlassColorScheme,
} from 'expo-glass-effect';

import { useBlurMaterial } from './useBlurMaterial';

export interface UseLiquidGlassResult {
  isGlassEnabled: boolean;
  glassColorScheme: GlassColorScheme;
}

/**
 * `isLiquidGlassAvailable` uses `requireNativeModule('ExpoGlassEffect')`, which
 * throws when the native module is missing (for example a reused Expo
 * dev-client binary from before the package was added). Treat that as
 * unavailable so callers can fall back to blur or an opaque surface.
 */
const isNativeLiquidGlassAvailable = (): boolean => {
  try {
    return isLiquidGlassAvailable();
  } catch {
    return false;
  }
};

/**
 * Whether a surface should use Liquid Glass, and in the app's theme rather
 * than the system's. `isLiquidGlassAvailable` ignores Reduce Transparency, so
 * that comes from the shared blur material state.
 */
export const useLiquidGlass = (): UseLiquidGlassResult => {
  const { isBlurAvailable, colorScheme } = useBlurMaterial();
  const [isAvailable] = useState(isNativeLiquidGlassAvailable);

  return {
    isGlassEnabled: isAvailable && isBlurAvailable,
    glassColorScheme: colorScheme,
  };
};

export default useLiquidGlass;
