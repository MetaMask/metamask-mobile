import Routes from '../../../../../constants/navigation/Routes';
import {
  EMPTY_VBA_ONBOARDING_SNAPSHOT,
  mergeVbaOnboardingSnapshot,
  type VbaOnboardingSnapshot,
} from './vbaOnboardingSnapshot';

export type VbaOnboardingRoute =
  | typeof Routes.RAMP.VBA_KYC_EMAIL
  | typeof Routes.RAMP.GET_PIX_KEY
  | typeof Routes.RAMP.VBA_VERIFY_IDENTITY
  | typeof Routes.RAMP.VBA_SUMSUB_KYC
  | typeof Routes.RAMP.VBA_KYC_PENDING
  | typeof Routes.RAMP.VBA_KYC_REJECTED
  | typeof Routes.RAMP.VBA_ONBOARDING_ERROR
  | typeof Routes.MONEY.HOME;

export type VbaFunnelStepId =
  | 'termsOne'
  | 'email'
  | 'providerTerms'
  | 'sumsub'
  | 'pending';

interface VbaFunnelStep {
  id: VbaFunnelStepId;
  route: VbaOnboardingRoute;
  isComplete: (snapshot: VbaOnboardingSnapshot) => boolean;
  /**
   * API-level prerequisite. When false, the step is skipped so a later
   * available step can run (e.g. vendor T&Cs require a session today).
   */
  isAvailable?: (snapshot: VbaOnboardingSnapshot) => boolean;
  completionPatch: Partial<VbaOnboardingSnapshot>;
}

/**
 * Product funnel order. Reorder this array to change screen sequence (subject
 * to each step's `isAvailable` API constraint).
 */
export const VBA_FUNNEL: readonly VbaFunnelStep[] = [
  {
    id: 'termsOne',
    route: Routes.RAMP.GET_PIX_KEY,
    isComplete: (snapshot) =>
      snapshot.termsOneAccepted || snapshot.vendorDisclaimersComplete,
    completionPatch: { termsOneAccepted: true },
  },
  {
    id: 'email',
    route: Routes.RAMP.VBA_KYC_EMAIL,
    // Email creates/resumes the session and flushes Terms 1 to the account.
    isComplete: (snapshot) =>
      snapshot.sessionExists && snapshot.vendorDisclaimersComplete,
    completionPatch: {
      sessionExists: true,
      vendorDisclaimersComplete: true,
    },
  },
  {
    id: 'providerTerms',
    route: Routes.RAMP.VBA_VERIFY_IDENTITY,
    isComplete: (snapshot) => snapshot.sessionDisclaimersComplete,
    completionPatch: { sessionDisclaimersComplete: true },
  },
  {
    id: 'sumsub',
    route: Routes.RAMP.VBA_SUMSUB_KYC,
    isComplete: (snapshot) =>
      snapshot.kycStatus !== 'none' &&
      snapshot.kycStatus !== 'new' &&
      snapshot.kycStatus !== 'retry',
    completionPatch: { kycStatus: 'pending' },
  },
  {
    id: 'pending',
    route: Routes.RAMP.VBA_KYC_PENDING,
    isComplete: (snapshot) =>
      snapshot.finalStatus === 'approved' && snapshot.activation === 'ready',
    completionPatch: { finalStatus: 'approved', activation: 'ready' },
  },
];

export const isVbaOnboardingRejected = (
  snapshot: VbaOnboardingSnapshot,
): boolean =>
  snapshot.finalStatus === 'rejected' || snapshot.kycStatus === 'rejected';

/**
 * Applies completion patches through `completedStepId` so a CTA can advance
 * without re-hydrating. Prior steps are marked complete so a lone flag (e.g.
 * vendor T&Cs) cannot bounce the user back to email.
 *
 * @param base - Last known snapshot, typically from resume.
 * @param completedStepId - Step the user just finished.
 * @returns Optimistic snapshot used to pick the next route.
 */
export const completeVbaFunnelStep = (
  base: VbaOnboardingSnapshot,
  completedStepId: VbaFunnelStepId,
): VbaOnboardingSnapshot => {
  let next = base;
  for (const step of VBA_FUNNEL) {
    next = mergeVbaOnboardingSnapshot(next, step.completionPatch);
    if (step.id === completedStepId) {
      break;
    }
  }
  return next;
};

/**
 * Maps a Core facts snapshot onto the Mobile route for the first incomplete,
 * available funnel step. Rejected KYC is a terminal overlay, not a step.
 *
 * @param snapshot - Facts from hydrate or an optimistic advance.
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
