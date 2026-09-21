import type { ComponentType } from 'react';
import type { GlassViewProps } from 'expo-glass-effect';

type NativeGlassViewComponent = ComponentType<GlassViewProps>;

let cachedNativeGlassView: NativeGlassViewComponent | null | undefined;

/**
 * Loads `GlassView` only when a caller actually needs it.
 *
 * `expo-glass-effect`'s iOS entry evaluates `requireNativeViewManager` at
 * module load, which throws when the ExpoGlassEffect native module is not in
 * the binary (stale Expo dev clients). A static import of `GlassView` would
 * crash the Trade tray before the availability check can run.
 */
export const getNativeGlassView = (): NativeGlassViewComponent | null => {
  if (cachedNativeGlassView !== undefined) {
    return cachedNativeGlassView;
  }

  try {
    // Native GlassView binds the view manager as a side effect of import.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GlassView } = require('expo-glass-effect') as {
      GlassView: NativeGlassViewComponent;
    };
    cachedNativeGlassView = GlassView;
  } catch {
    cachedNativeGlassView = null;
  }

  return cachedNativeGlassView;
};

export const resetNativeGlassViewCacheForTests = (): void => {
  cachedNativeGlassView = undefined;
};
