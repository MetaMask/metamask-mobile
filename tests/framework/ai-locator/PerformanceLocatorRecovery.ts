import TimerStore from '../TimerStore.ts';
import type {
  LocatorRecoveryProvider,
  SelfHealingTapOptions,
} from './SelfHealingLocator.ts';

export interface PerformanceLocatorRecovery {
  provider: LocatorRecoveryProvider;
  onRecovered: NonNullable<SelfHealingTapOptions['onRecovered']>;
}

let activeRecovery: PerformanceLocatorRecovery | undefined;
let performanceSuiteActive = false;

/**
 * Marks the current Playwright test as a performance suite scenario.
 *
 * Page Object / flow helpers that only apply to performance (A/B header
 * selectors, Account Hub add-wallet ID, Android account-cell tap path) must
 * check this so smoke Appium keeps the shared deterministic selectors.
 */
export function setPerformanceSuiteActive(active: boolean): void {
  performanceSuiteActive = active;
}

export function isPerformanceSuiteActive(): boolean {
  return performanceSuiteActive;
}

/**
 * Enables locator recovery for the current performance test.
 *
 * Recovery is process-local and must be cleared by the performance fixture
 * after each test to prevent state leaking between scenarios.
 */
export function configurePerformanceLocatorRecovery(
  recovery: PerformanceLocatorRecovery | undefined,
): void {
  activeRecovery = recovery;
}

/**
 * Returns the active recovery config, or undefined when recovery must not run.
 *
 * Recovery is suppressed while any performance timer is active so screenshot /
 * model latency cannot inflate measured durations (e.g. unlock taps inside a
 * started `TimerHelper`).
 */
export function getPerformanceLocatorRecovery():
  | PerformanceLocatorRecovery
  | undefined {
  if (!activeRecovery) {
    return undefined;
  }
  if (TimerStore.hasActiveTimer()) {
    return undefined;
  }
  return activeRecovery;
}
