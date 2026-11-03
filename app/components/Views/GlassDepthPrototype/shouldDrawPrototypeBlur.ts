import type {
  HardwareTier,
  NetworkTier,
} from '../../../util/deviceCapability/types';

/**
 * Whether the glass-depth prototype may draw a blur.
 *
 * Follows the device-capability matrix: known offline is local UI with no
 * blur, and a known LOW device skips blur. A `null` tier is unknown, so it
 * keeps the product default rather than being treated as low-end or offline.
 *
 * @param hardware - Hardware tier from `getHardwareTier()`, or null if unknown.
 * @param network - Network tier from `useNetworkTier()`, or null if unknown.
 * @returns True when the prototype's tab bar may use a blurred material.
 */
export const shouldDrawPrototypeBlur = (
  hardware: HardwareTier | null,
  network: NetworkTier | null,
): boolean => {
  if (network === 'NONE') {
    return false;
  }
  if (hardware === 'LOW' && network !== null) {
    return false;
  }
  return true;
};
