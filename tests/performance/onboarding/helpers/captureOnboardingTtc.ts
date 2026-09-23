import type { OnboardingScreenId } from '../../../../app/hooks/performance/onboardingPerformanceIds';
import type { PerformanceTracker } from '../../../reporters/PerformanceTracker';
import type TimerHelper from '../../../framework/TimerHelper';
import { addAppScreenTtcTimer } from '../../utils/readScreenTtc';

/** Short enough that missing probes never delay OAuth / seedless flow. */
const SEEDLESS_TTC_TIMEOUT_MS = 2_000;

/**
 * Attach a nav/flow timer as soon as it finishes measuring so partial metrics
 * survive if a later step times out (timers were previously only added at end).
 */
export function trackTimer(
  performanceTracker: PerformanceTracker,
  timer: TimerHelper,
): void {
  performanceTracker.addTimer(timer);
}

/**
 * Soft-fail in-app TTC capture for seedless flows.
 * Must not run long Appium polls before provider OAuth taps.
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
    timeoutMs: SEEDLESS_TTC_TIMEOUT_MS,
  });
}
