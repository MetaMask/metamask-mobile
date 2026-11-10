import {
  VBA_KYC_STATUSES,
  type VbaKycStatus,
  type VbaOnboardingSnapshot,
} from '@metamask/ramps-controller';
import type { KycStep } from '@metamask/kyc-controller';
import { readVbaKycStatusOverrideEnv } from './vbaDevOverrides.env';

/**
 * Dev-only KYC status override for VBA onboarding demos. Set
 * `MM_MONEY_VBA_KYC_STATUS_OVERRIDE` in `.js.env` to one of the
 * {@link VBA_KYC_STATUSES} values (for example `rejected`) and restart Metro.
 * Production builds ignore it.
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
 * Applies {@link getVbaKycStatusOverride} to a hydrated snapshot. A forced
 * `rejected` or `approved` also marks the session and disclaimers complete so
 * the funnel reaches the status screen instead of an earlier module.
 *
 * @param snapshot - Snapshot returned by hydrate.
 * @returns The snapshot, with the KYC status replaced when an override is set.
 */
export const applyVbaDevOverrides = (
  snapshot: VbaOnboardingSnapshot,
): VbaOnboardingSnapshot => {
  const kycStatus = getVbaKycStatusOverride();
  if (!kycStatus) {
    return snapshot;
  }

  return {
    ...snapshot,
    sessionExists: true,
    vendorDisclaimersComplete: true,
    sessionDisclaimersComplete: true,
    kycStatus,
  };
};

const KYC_STEP_FOR_OVERRIDE: Partial<Record<VbaKycStatus, KycStep>> = {
  retry: 'kyc_retry',
  pending: 'kyc_pending',
  approved: 'approved',
  rejected: 'kyc_rejected',
};

/**
 * Applies {@link getVbaKycStatusOverride} to the KYC step from kyc-api, so a
 * forced status still opens its status screen. `none` and `new` leave the
 * step as kyc-api returned it.
 *
 * @param step - The step kyc-api returned.
 * @returns The step, replaced when an override maps to one.
 */
export const applyVbaDevStepOverride = (step: KycStep): KycStep => {
  const kycStatus = getVbaKycStatusOverride();
  return (kycStatus && KYC_STEP_FOR_OVERRIDE[kycStatus]) ?? step;
};
