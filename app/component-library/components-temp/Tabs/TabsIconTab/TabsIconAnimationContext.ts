import { createContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';

/**
 * Provides an optional Reanimated SharedValue (0 = icons expanded, 1 = icons collapsed)
 * to Tab components without threading props through TabsList / TabsBar. The value drives
 * the icon's height / marginBottom / opacity via useAnimatedStyle on the UI thread —
 * no per-frame JS work, no layout reflow on the JS thread.
 *
 * Consumers that don't provide this context get the default (undefined), which means
 * icons render at full size — preserving existing behaviour.
 */
export interface TabIconAnimationContextValue {
  iconCollapseProgress?: SharedValue<number>;
}

export const TabIconAnimationContext =
  createContext<TabIconAnimationContextValue>({});
