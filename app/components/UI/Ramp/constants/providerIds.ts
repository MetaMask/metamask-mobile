/**
 * Stable identifiers for Ramps providers as returned by the
 * `RampsController`. Use these constants instead of hardcoding the string
 * literals so callers fail at the type level when an id is renamed.
 */
export const RAMPS_PROVIDER_IDS = {
  TRANSAK_NATIVE: 'transak-native',
} as const;

export type RampsProviderId =
  (typeof RAMPS_PROVIDER_IDS)[keyof typeof RAMPS_PROVIDER_IDS];
