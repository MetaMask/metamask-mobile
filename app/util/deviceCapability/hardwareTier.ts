import { Platform } from 'react-native';
import { getTotalMemorySync } from 'react-native-device-info';
import { computeHardwareTier } from './computeHardwareTier';
import { getDeviceCapabilityOverride } from './override';
import type { HardwareTier } from './types';

/** Reads total device memory and classifies it, unless overridden in development. */
export function getHardwareTier(): HardwareTier | null {
  const { hardware } = getDeviceCapabilityOverride();
  if (hardware !== undefined) return hardware;
  return readHardwareTier();
}

/** Reads the measured tier independently of any dev override. */
export function readHardwareTier(): HardwareTier | null {
  const os = Platform.OS === 'ios' ? 'ios' : 'android';
  return computeHardwareTier(os, getTotalMemorySync());
}
