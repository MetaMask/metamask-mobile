import { Platform } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';

/**
 * Platform-specific safe area edges.
 * Android includes 'bottom' to handle the navigation bar overlay.
 * iOS excludes 'bottom' to avoid excessive padding.
 */
export const SAFE_AREA_EDGES: Edge[] =
  Platform.OS === 'android' ? ['left', 'right', 'bottom'] : ['left', 'right'];
