import { createContext } from 'react';
import { Animated } from 'react-native';

/**
 * Provides an optional RN Animated.Value (0 = icons expanded, 1 = icons collapsed)
 * to Tab components without threading props through TabsList / TabsBar.
 * Consumers that don't provide this context get the default (undefined), which
 * means icons render at full size — preserving existing behaviour.
 */
export interface TabIconAnimationContextValue {
  iconCollapseAnim?: Animated.Value;
}

export const TabIconAnimationContext =
  createContext<TabIconAnimationContextValue>({});
