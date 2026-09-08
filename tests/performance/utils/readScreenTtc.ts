import Matchers from '../../framework/Matchers';
import { PlatformDetector } from '../../framework/PlatformLocator';
import {
  parseScreenTtcAccessibilityLabel,
  screenTtcTestId,
} from '../../../app/hooks/performance/screenTtcRegistry';
import type { OnboardingScreenId } from '../../../app/hooks/performance/onboardingPerformanceIds';
import TimerHelper, {
  type PlatformThreshold,
} from '../../framework/TimerHelper';
import type { PerformanceTracker } from '../../reporters/PerformanceTracker';

const DEFAULT_TIMEOUT_MS = 15_000;
const POLL_MS = 200;

async function readProbeLabel(screenId: OnboardingScreenId): Promise<string> {
  const el = await Matchers.getElementByID(screenTtcTestId(screenId));
  if (PlatformDetector.isAndroid()) {
    return (await el.getAttribute('content-desc')) ?? '';
  }
  return (
    (await el.getAttribute('label')) ?? (await el.getAttribute('name')) ?? ''
  );
}

/**
 * Waits for the in-app TTC probe written by `useScreenPerformance` (same
 * mount→contentReady duration as Sentry Onboarding Screen Time To Content).
 */
export async function waitForAppScreenTtc(
  screenId: OnboardingScreenId,
  options?: { timeoutMs?: number; minGeneration?: number },
): Promise<number> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const minGeneration = options?.minGeneration ?? 1;
  const deadline = Date.now() + timeoutMs;
  let lastLabel = '';

  while (Date.now() < deadline) {
    try {
      lastLabel = await readProbeLabel(screenId);
      const parsed = parseScreenTtcAccessibilityLabel(lastLabel);
      if (
        parsed &&
        parsed.screenId === screenId &&
        parsed.generation >= minGeneration
      ) {
        return parsed.durationMs;
      }
    } catch {
      // Probe not mounted yet.
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }

  throw new Error(
    `Timed out waiting for in-app TTC probe for [${screenId}] within ${timeoutMs}ms (last label: "${lastLabel}")`,
  );
}

/**
 * Reads in-app TTC and registers it on the performance tracker.
 * Thresholds should stay generous until BrowserStack baselines exist.
 */
export async function addAppScreenTtcTimer(options: {
  performanceTracker: PerformanceTracker;
  screenId: OnboardingScreenId;
  platform: 'ios' | 'android';
  threshold: PlatformThreshold;
  minGeneration?: number;
}): Promise<number> {
  const durationMs = await waitForAppScreenTtc(options.screenId, {
    minGeneration: options.minGeneration,
  });

  const timer = new TimerHelper(
    `TTC [${options.screenId}]: in-app mount→contentReady`,
    options.threshold,
    options.platform,
  );
  timer.recordDuration(durationMs);
  options.performanceTracker.addTimer(timer);
  return durationMs;
}
