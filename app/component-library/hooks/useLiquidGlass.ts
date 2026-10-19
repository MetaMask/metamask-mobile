import { useState } from 'react';
import {
  isLiquidGlassAvailable,
  type GlassColorScheme,
} from 'expo-glass-effect';

import { useBlurMaterial, type BlurTint } from './useBlurMaterial';

export interface UseLiquidGlassResult {
  isGlassEnabled: boolean;
  glassColorScheme: GlassColorScheme;
  /** iOS without Liquid Glass: draw the surface as a blurred system material. */
  isBlurEnabled: boolean;
  blurTint: BlurTint;
}

/**
 * Whether a surface should use Liquid Glass, and in the app's theme rather
 * than the system's. `isLiquidGlassAvailable` ignores Reduce Transparency, so
 * that comes from the shared blur material state. Older iOS gets the blur tier
 * instead so the surface still reads as translucent chrome.
 */
export const useLiquidGlass = (): UseLiquidGlassResult => {
  const { isBlurAvailable, colorScheme, tint } = useBlurMaterial();
  const [isAvailable] = useState(isLiquidGlassAvailable);

  return {
    isGlassEnabled: isAvailable && isBlurAvailable,
    glassColorScheme: colorScheme,
    isBlurEnabled: !isAvailable && isBlurAvailable,
    blurTint: tint,
  };
};

export default useLiquidGlass;
