import Matchers from '../../framework/Matchers';
import AppiumMatchers from '../../framework/AppiumMatchers';
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
import type { AppiumElement } from '../../framework/AppiumElement';

const DEFAULT_TIMEOUT_MS = 20_000;
const POLL_MS = 250;

async function readAttribute(el: AppiumElement, name: string): Promise<string> {
  try {
    return (await el.getAttribute(name)) ?? '';
  } catch {
    return '';
  }
}

async function labelFromElement(el: AppiumElement): Promise<string> {
  if (PlatformDetector.isAndroid()) {
    return (
      (await readAttribute(el, 'contentDescription')) ||
      (await readAttribute(el, 'content-desc')) ||
      (await readAttribute(el, 'text')) ||
      ''
    );
  }
  return (
    (await readAttribute(el, 'label')) ||
    (await readAttribute(el, 'name')) ||
    (await readAttribute(el, 'value')) ||
    ''
  );
}

/**
 * Resolve the probe using several strategies — Android resource-ids are often
 * package-qualified (`io.metamask…:id/perf-ttc-…`), and content-desc may be
 * easier to match than resource-id for accessibility Views.
 */
async function findProbeElement(
  screenId: OnboardingScreenId,
): Promise<AppiumElement> {
  const testId = screenTtcTestId(screenId);
  const errors: string[] = [];

  const attempts: (() => Promise<AppiumElement>)[] = [
    // Suffix match handles package-qualified Android resource ids.
    () => Matchers.getElementByID(new RegExp(`${testId}$`)),
    () => Matchers.getElementByID(testId),
  ];

  if (PlatformDetector.isAndroid()) {
    attempts.push(() =>
      AppiumMatchers.getElementByAndroidUIAutomator(
        `.descriptionStartsWith("ttc:${screenId}:")`,
      ),
    );
    attempts.push(() =>
      AppiumMatchers.getElementById(testId, { exact: false }),
    );
  } else {
    attempts.push(() =>
      AppiumMatchers.getElementByIOSPredicate(
        `label BEGINSWITH "ttc:${screenId}:" OR name == "${testId}"`,
      ),
    );
  }

  for (const attempt of attempts) {
    try {
      const el = await attempt();
      // Presence is enough — probes are near-invisible, so skip isDisplayed.
      // AppiumElement exposes isVisible, not isDisplayed (TS2339 in lint:tsc).
      return el;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(
    `TTC probe not found for [${screenId}] (tried ${attempts.length} strategies): ${errors.join(' | ')}`,
  );
}

async function readProbeLabel(screenId: OnboardingScreenId): Promise<string> {
  const el = await findProbeElement(screenId);
  return labelFromElement(el);
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
  let lastError = '';

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
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }

  throw new Error(
    `Timed out waiting for in-app TTC probe for [${screenId}] within ${timeoutMs}ms (last label: "${lastLabel}"; last error: ${lastError})`,
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
