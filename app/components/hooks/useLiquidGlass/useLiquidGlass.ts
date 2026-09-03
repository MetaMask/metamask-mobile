import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  isLiquidGlassAvailable,
  type GlassColorScheme,
} from 'expo-glass-effect';

import { useTheme } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';

export interface UseLiquidGlassResult {
  /**
   * Whether to draw a glass surface. False on Android, on iOS below 26, and
   * whenever the user has turned Reduce Transparency on. Callers are expected
   * to paint an opaque fallback surface when this is false.
   */
  isGlassEnabled: boolean;
  /**
   * The app's own theme, since MetaMask's appearance is independent of the
   * system's — leaving glass on `auto` would light-tint a dark-themed app on a
   * light-mode device.
   */
  glassColorScheme: GlassColorScheme;
}

/**
 * Resolves whether Liquid Glass should be used for a surface, and which
 * appearance it should take.
 *
 * `isLiquidGlassAvailable` reports build and OS capability only. It stays true
 * when Reduce Transparency is on, so that has to be checked separately or the
 * setting is silently ignored.
 */
export const useLiquidGlass = (): UseLiquidGlassResult => {
  const { themeAppearance } = useTheme();
  // Lazy initial state: a native constant read, so it only needs doing once.
  const [isAvailable] = useState(isLiquidGlassAvailable);
  const [prefersReducedTransparency, setPrefersReducedTransparency] =
    useState(false);

  useEffect(() => {
    if (!isAvailable) {
      return undefined;
    }

    let isActive = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then((enabled) => {
      if (isActive) {
        setPrefersReducedTransparency(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setPrefersReducedTransparency,
    );

    return () => {
      isActive = false;
      subscription.remove();
    };
  }, [isAvailable]);

  return {
    isGlassEnabled: isAvailable && !prefersReducedTransparency,
    glassColorScheme: themeAppearance === AppThemeKey.dark ? 'dark' : 'light',
  };
};

export default useLiquidGlass;
