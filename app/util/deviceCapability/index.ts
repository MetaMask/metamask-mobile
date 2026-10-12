import { Platform } from 'react-native';
import { getTotalMemorySync } from 'react-native-device-info';
import { computeHardwareTier } from './computeHardwareTier';
import type { HardwareTier } from './types';

export type { HardwareTier } from './types';

/**
 * Reads total device memory and returns the current process hardware tier.
 *
 * Synchronous and uncached. Any `Platform.OS` other than `ios` uses Android thresholds.
 */
export function getHardwareTier(): HardwareTier | null {
  const os = Platform.OS === 'ios' ? 'ios' : 'android';
  return computeHardwareTier(os, getTotalMemorySync());
}
