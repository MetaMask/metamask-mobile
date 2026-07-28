import { v4 as uuidv4 } from 'uuid';
import { endTrace, trace, TraceName, TraceOperation } from '../../util/trace';
import type {
  OnboardingCtaId,
  OnboardingScreenId,
} from './onboardingPerformanceIds';
import { getOnboardingPerformanceTags } from './onboardingPerformanceTags';

interface PendingNavigation {
  ctaId: OnboardingCtaId;
  traceId: string;
}

let pendingNavigation: PendingNavigation | null = null;

export function startOnboardingCtaNavigation(ctaId: OnboardingCtaId): void {
  if (pendingNavigation) {
    cancelPendingOnboardingCtaNavigation('superseded');
  }

  const traceId = uuidv4();
  trace({
    name: TraceName.OnboardingCtaNavigation,
    op: TraceOperation.OnboardingNavigationPerformance,
    id: traceId,
    tags: getOnboardingPerformanceTags({ cta_id: ctaId }),
  });
  pendingNavigation = { ctaId, traceId };
}

export function getPendingOnboardingCtaNavigation(): PendingNavigation | null {
  return pendingNavigation;
}

export function completeOnboardingCtaNavigation(
  destinationScreenId: OnboardingScreenId,
): void {
  if (!pendingNavigation) {
    return;
  }

  endTrace({
    name: TraceName.OnboardingCtaNavigation,
    id: pendingNavigation.traceId,
    data: {
      success: true,
      cta_id: pendingNavigation.ctaId,
      destination_screen_id: destinationScreenId,
    },
  });
  pendingNavigation = null;
}

export function cancelPendingOnboardingCtaNavigation(reason: string): void {
  if (!pendingNavigation) {
    return;
  }

  endTrace({
    name: TraceName.OnboardingCtaNavigation,
    id: pendingNavigation.traceId,
    data: {
      success: false,
      reason,
      cta_id: pendingNavigation.ctaId,
    },
  });
  pendingNavigation = null;
}

/** @internal Reset module state between test runs. */
export function _resetOnboardingNavigationPerformanceForTesting(): void {
  pendingNavigation = null;
}
