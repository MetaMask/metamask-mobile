import Routes from '../../../../../constants/navigation/Routes';
import {
  EMPTY_VBA_ONBOARDING_SNAPSHOT,
  type VbaOnboardingSnapshot,
} from './vbaOnboardingSnapshot';

export type VbaOnboardingRoute =
  | typeof Routes.RAMP.VBA_KYC_EMAIL
  | typeof Routes.RAMP.CREATE_VIRTUAL_BANK_ACCOUNT
  | typeof Routes.RAMP.VBA_VERIFY_IDENTITY
  | typeof Routes.RAMP.VBA_SUMSUB_KYC
  | typeof Routes.RAMP.VBA_KYC_PENDING
  | typeof Routes.RAMP.VBA_KYC_REJECTED
  | typeof Routes.RAMP.VBA_ONBOARDING_ERROR
  | typeof Routes.MONEY.HOME;

interface VbaFunnelStep {
  id: string;
  route: VbaOnboardingRoute;
  isComplete: (snapshot: VbaOnboardingSnapshot) => boolean;
  /**
   * API-level prerequisite. When false, the step is skipped so a later
   * available step can run (e.g. vendor T&Cs require a session today).
   */
  isAvailable?: (snapshot: VbaOnboardingSnapshot) => boolean;
}

/**
 * Product funnel order used at entry/retry to pick the first incomplete
 * screen. After a successful CTA, screens navigate to the next route by name.
 */
export const VBA_FUNNEL: readonly VbaFunnelStep[] = [
  {
    id: 'termsOne',
    route: Routes.RAMP.CREATE_VIRTUAL_BANK_ACCOUNT,
    isComplete: (snapshot) =>
      snapshot.termsOneAccepted || snapshot.vendorDisclaimersComplete,
  },
  {
    id: 'email',
    route: Routes.RAMP.VBA_KYC_EMAIL,
    isComplete: (snapshot) =>
      snapshot.sessionExists && snapshot.vendorDisclaimersComplete,
  },
  {
    id: 'providerTerms',
    route: Routes.RAMP.VBA_VERIFY_IDENTITY,
    isComplete: (snapshot) => snapshot.sessionDisclaimersComplete,
  },
  {
    id: 'sumsub',
    route: Routes.RAMP.VBA_SUMSUB_KYC,
    isComplete: (snapshot) =>
      snapshot.kycStatus !== 'none' &&
      snapshot.kycStatus !== 'new' &&
      snapshot.kycStatus !== 'retry',
  },
  {
    id: 'pending',
    route: Routes.RAMP.VBA_KYC_PENDING,
    isComplete: (snapshot) =>
      snapshot.kycStatus === 'approved' && snapshot.autorampStatus === 'ready',
  },
];

export const isVbaOnboardingRejected = (
  snapshot: VbaOnboardingSnapshot,
): boolean => snapshot.kycStatus === 'rejected';

/**
 * Maps a Core facts snapshot onto the Mobile route for the first incomplete,
 * available funnel step. Rejected KYC is a terminal overlay, not a step.
 *
 * @param snapshot - Facts from hydrate.
 * @returns The route to present, or the recoverable error route.
 */
export const getVbaRouteForSnapshot = (
  snapshot: VbaOnboardingSnapshot | null | undefined,
): VbaOnboardingRoute => {
  if (!snapshot) {
    return Routes.RAMP.VBA_ONBOARDING_ERROR;
  }
  if (isVbaOnboardingRejected(snapshot)) {
    return Routes.RAMP.VBA_KYC_REJECTED;
  }

  for (const step of VBA_FUNNEL) {
    if (step.isComplete(snapshot)) {
      continue;
    }
    if (step.isAvailable && !step.isAvailable(snapshot)) {
      continue;
    }
    return step.route;
  }

  return Routes.MONEY.HOME;
};

export const createEmptyVbaOnboardingSnapshot = (): VbaOnboardingSnapshot => ({
  ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
});
