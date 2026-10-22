import { useReducedMotion } from 'react-native-reanimated';

/**
 * Whether the OS Reduce Motion setting was on when the app started.
 *
 * Reanimated's `useReducedMotion` reads the native OS snapshot. It does not
 * follow `ReducedMotionConfig`, which this app sets to `Never` so other
 * animations keep running.
 */
export const useMarketingMomentReduceMotion = (): boolean => useReducedMotion();
