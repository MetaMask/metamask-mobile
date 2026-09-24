import type {
  LocatorRecoveryProvider,
  SelfHealingTapOptions,
} from './SelfHealingLocator.ts';

export interface PerformanceLocatorRecovery {
  provider: LocatorRecoveryProvider;
  onRecovered: NonNullable<SelfHealingTapOptions['onRecovered']>;
}

let activeRecovery: PerformanceLocatorRecovery | undefined;

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

export function getPerformanceLocatorRecovery():
  | PerformanceLocatorRecovery
  | undefined {
  return activeRecovery;
}
