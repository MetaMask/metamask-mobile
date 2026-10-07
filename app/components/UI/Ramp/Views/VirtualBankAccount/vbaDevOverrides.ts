import {
  VBA_AUTORAMP_STATUSES,
  VBA_KYC_STATUSES,
  type VbaAutorampStatus,
  type VbaKycStatus,
  type VbaOnboardingSnapshot,
} from '@metamask/ramps-controller';
import {
  readVbaAutorampStatusOverrideEnv,
  readVbaKycStatusOverrideEnv,
  readVbaSetupErrorOverrideEnv,
} from './vbaDevOverrides.env';

export const shouldForceVbaSetupError = (): boolean =>
  __DEV__ && readVbaSetupErrorOverrideEnv() === 'true';

/**
 * Dev-only KYC status override. Local demo only. Do not commit on TRAM-4073.
 *
 * @returns The forced status, or null when unset or not a known status.
 */
export const getVbaKycStatusOverride = (): VbaKycStatus | null => {
  if (!__DEV__) {
    return null;
  }

  const value = readVbaKycStatusOverrideEnv();
  if (!value) {
    return null;
  }

  return (VBA_KYC_STATUSES as readonly string[]).includes(value)
    ? (value as VbaKycStatus)
    : null;
};

/**
 * Dev-only autoramp status override. Local demo only. Do not commit on
 * TRAM-4073. `retryable_failure` with an approved KYC opens the account
 * creation failure page.
 *
 * @returns The forced status, or null when unset or not a known status.
 */
export const getVbaAutorampStatusOverride = (): VbaAutorampStatus | null => {
  if (!__DEV__) {
    return null;
  }

  const value = readVbaAutorampStatusOverrideEnv();
  if (!value) {
    return null;
  }

  return (VBA_AUTORAMP_STATUSES as readonly string[]).includes(value)
    ? (value as VbaAutorampStatus)
    : null;
};

/**
 * Applies the local demo overrides to a hydrated snapshot. A forced KYC
 * status also marks the session and disclaimers complete so the funnel can
 * reach the account status screen.
 *
 * @param snapshot - Snapshot returned by hydrate.
 * @returns The snapshot, with demo statuses replaced when overrides are set.
 */
export const applyVbaDevOverrides = (
  snapshot: VbaOnboardingSnapshot,
): VbaOnboardingSnapshot => {
  const kycStatus = getVbaKycStatusOverride();
  const autorampStatus = getVbaAutorampStatusOverride();
  if (!kycStatus && !autorampStatus) {
    return snapshot;
  }

  return {
    ...snapshot,
    ...(kycStatus
      ? {
          sessionExists: true,
          vendorDisclaimersComplete: true,
          sessionDisclaimersComplete: true,
          kycStatus,
        }
      : {}),
    ...(autorampStatus ? { autorampStatus } : {}),
  };
};
