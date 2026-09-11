import type { OnboardingScreenId } from '../../../app/hooks/performance/onboardingPerformanceIds';
import type { PerformanceTracker } from '../../reporters/PerformanceTracker';
import { addAppScreenTtcTimer } from '../../utils/readScreenTtc';

/**
 * Soft-fail in-app TTC capture for seedless flows.
 * Missing probes must never fail OAuth/nav timers (TO-1039 / prior PR flake).
 */
export async function captureOnboardingTtc(
  performanceTracker: PerformanceTracker,
  screenId: OnboardingScreenId,
  platform: 'ios' | 'android',
): Promise<void> {
  await addAppScreenTtcTimer({
    performanceTracker,
    screenId,
    platform,
    required: false,
  });
}
