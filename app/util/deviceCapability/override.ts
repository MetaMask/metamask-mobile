import type { HardwareTier, LatencyBucket, NetworkTier } from './types';

export interface DeviceCapabilityOverride {
  hardware?: HardwareTier | null;
  network?: NetworkTier | null;
  latency?: LatencyBucket;
}

/** Parses the dev build's comma-separated tier overrides. */
export function parseDeviceCapabilityOverride(
  value: string | undefined,
): DeviceCapabilityOverride {
  const result: DeviceCapabilityOverride = {};
  for (const entry of value?.split(',') ?? []) {
    const [key, tier, extra] = entry.trim().split('=');
    if (extra !== undefined) continue;
    if (
      key === 'hardware' &&
      (tier === 'LOW' || tier === 'MID' || tier === 'HIGH')
    ) {
      result.hardware = tier;
    }
    if (
      key === 'network' &&
      (tier === 'NONE' ||
        tier === 'SLOW_CELLULAR' ||
        tier === 'FAST_CELLULAR' ||
        tier === 'WIFI')
    ) {
      result.network = tier;
    }
    if (
      key === 'latency' &&
      (tier === 'UNKNOWN' || tier === 'OK' || tier === 'SLOW')
    ) {
      result.latency = tier;
    }
  }
  return result;
}

const initial: Readonly<DeviceCapabilityOverride> = __DEV__
  ? parseDeviceCapabilityOverride(process.env.MM_DEVICE_CAPABILITY_OVERRIDE)
  : {};
const disabled: Readonly<DeviceCapabilityOverride> = Object.freeze({});
let current: Readonly<DeviceCapabilityOverride> = initial;
const listeners = new Set<() => void>();

/** Returns dev overrides; always empty in release bundles. */
export function getDeviceCapabilityOverride(): Readonly<DeviceCapabilityOverride> {
  return __DEV__ ? current : disabled;
}

/** Replaces the override in development, or restores build defaults with no argument. */
export function setDeviceCapabilityOverride(override = initial): void {
  if (!__DEV__) return;
  if (
    override.hardware === current.hardware &&
    override.network === current.network &&
    override.latency === current.latency
  )
    return;
  current = { ...override };
  listeners.forEach((listener) => listener());
}

/** Subscribes to override changes in development. */
export function subscribeDeviceCapabilityOverride(
  listener: () => void,
): () => void {
  if (__DEV__) listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
