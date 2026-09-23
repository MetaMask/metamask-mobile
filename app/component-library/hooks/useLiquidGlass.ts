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
 * Whether a surface should use Liquid Glass, and in the app's theme rather
 * than the system's. `isLiquidGlassAvailable` ignores Reduce Transparency, so
 * that comes from the shared blur material state.
 */
export const useLiquidGlass = (): UseLiquidGlassResult => {
  const { isBlurAvailable, colorScheme } = useBlurMaterial();
  const [isAvailable] = useState(isLiquidGlassAvailable);

  return {
    isGlassEnabled: isAvailable && isBlurAvailable,
    glassColorScheme: colorScheme,
  };
};

export default useLiquidGlass;
