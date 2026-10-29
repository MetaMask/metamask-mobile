import {
  ANDROID_HARDWARE_THRESHOLDS,
  IOS_HARDWARE_THRESHOLDS,
} from './thresholds';
import type { HardwareTier } from './types';

/**
 * Classifies total RAM into a hardware tier.
 *
 * Returns `null` when memory is missing, non-finite, or not positive.
 *
 * @param os - `'ios'` uses inclusive GiB bands. `'android'` uses strict bands.
 * Callers map every other `Platform.OS` to `'android'` before calling this.
 * @param totalMemoryBytes - Total device memory in bytes, or `null` when unknown.
 */
export function computeHardwareTier(
  os: 'ios' | 'android',
  totalMemoryBytes: number | null,
): HardwareTier | null {
  const bytes = totalMemoryBytes ?? Number.NaN;
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return null;
  }

  if (os === 'ios') {
    if (bytes <= IOS_HARDWARE_THRESHOLDS.LOW_MAX_BYTES) {
      return 'LOW';
    }
    if (bytes <= IOS_HARDWARE_THRESHOLDS.MID_MAX_BYTES) {
      return 'MID';
    }
    return 'HIGH';
  }

  if (bytes < ANDROID_HARDWARE_THRESHOLDS.LOW_BELOW_BYTES) {
    return 'LOW';
  }
  if (bytes < ANDROID_HARDWARE_THRESHOLDS.MID_BELOW_BYTES) {
    return 'MID';
  }
  return 'HIGH';
}
