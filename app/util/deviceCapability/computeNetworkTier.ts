import type { NetworkTier } from './types';

interface ComputeNetworkTierInput {
  type: string | null;
  cellularGeneration: string | null;
  isInternetReachable: boolean | null;
}

/**
 * Maps NetInfo fields to a network tier.
 *
 * Explicit unreachability (`type === 'none'` or `isInternetReachable === false`)
 * returns `'NONE'` before unknown-type checks. Returns `null` when the
 * connection type cannot be placed (unknown, vpn, bluetooth, wimax, other, or
 * cellular with no generation).
 */
export function computeNetworkTier(
  input: ComputeNetworkTierInput,
): NetworkTier | null {
  const { type, cellularGeneration, isInternetReachable } = input;

  if (type === 'none' || isInternetReachable === false) {
    return 'NONE';
  }
  if (type === null || type === 'unknown') {
    return null;
  }
  if (type === 'wifi' || type === 'ethernet') {
    return 'WIFI';
  }
  // vpn, bluetooth, wimax, other, and any future type fall through here.
  if (type !== 'cellular') {
    return null;
  }
  if (cellularGeneration === '4g' || cellularGeneration === '5g') {
    return 'FAST_CELLULAR';
  }
  if (cellularGeneration === '2g' || cellularGeneration === '3g') {
    return 'SLOW_CELLULAR';
  }
  return null;
}
