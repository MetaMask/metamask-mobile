import { Platform } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';

/**
 * Returns the safe area edges based on platform.
 * Android includes 'bottom' to handle the navigation bar overlay.
 * iOS excludes 'bottom' to avoid excessive padding.
 */
export const getSafeAreaEdges = (): Edge[] =>
  Platform.OS === 'android' ? ['left', 'right', 'bottom'] : ['left', 'right'];
