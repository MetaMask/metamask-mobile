import { useEffect, useRef } from 'react';
import type { OnboardingScreenId } from './onboardingPerformanceIds';
import {
  cancelPendingOnboardingCtaNavigation,
  completeOnboardingCtaNavigation,
  getPendingOnboardingCtaNavigation,
} from './onboardingNavigationPerformanceState';

interface UseNavigationPerformanceConfig {
  destinationScreenId: OnboardingScreenId;
  destinationReady: boolean;
  enabled?: boolean;
}

export function useNavigationPerformance({
  destinationScreenId,
  destinationReady,
  enabled = true,
}: UseNavigationPerformanceConfig): void {
  const completed = useRef(false);

  useEffect(() => {
    if (!enabled || !destinationReady || completed.current) {
      return;
    }

    if (!getPendingOnboardingCtaNavigation()) {
      return;
    }

    completeOnboardingCtaNavigation(destinationScreenId);
    completed.current = true;
  }, [destinationReady, destinationScreenId, enabled]);

  useEffect(
    () => () => {
      if (completed.current || !getPendingOnboardingCtaNavigation()) {
        return;
      }
      cancelPendingOnboardingCtaNavigation('unmounted');
    },
    [],
  );
}
