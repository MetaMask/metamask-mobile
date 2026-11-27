import type { Fixtures, TestInfo } from '@playwright/test';
import { createAppiumLogger } from '../../appiumLogger.ts';
import { interruptingScreenGuard } from '../../interrupting-screens/InterruptingScreenGuard.ts';
import { appiumFlakyFixExecutor } from '../../flaky-recovery/AppiumFlakyFixExecutor.ts';
import { createClaudeFlakyRecoveryProvider } from '../../flaky-recovery/ClaudeFlakyRecoveryProvider.ts';
import {
  isFlakyRecoveryEnabled,
  resolveFlakyRecoveryLimits,
} from '../../flaky-recovery/FlakyRecoveryConfig.ts';
import { publishFlakyRecovery } from '../../flaky-recovery/FlakyRecoveryReporting.ts';
import { FlakyRecoveryRuntime } from '../../flaky-recovery/FlakyRecoverySession.ts';
import type { TestLevelFixtures, WorkerLevelFixtures } from './types.ts';

const logger = createAppiumLogger('aiFlakyRecovery');

/**
 * Performance tests carry a `@Performance*` tag in their title path. They own
 * their guard configuration (`performanceTracker`), so this fixture never
 * touches them.
 */
export function isPerformanceTest(
  titlePath: string[],
  tags: string[] = [],
): boolean {
  return [...titlePath, ...tags].some((part) => part.includes('@Performance'));
}

/**
 * Auto fixture: arms AI flaky-failure recovery for E2E smoke tests when
 * `AI_FLAKY_RECOVERY_ENABLED=true` and `ANTHROPIC_API_KEY` are set. Nothing
 * runs on the happy path; the guard only reacts after a tap / wait / scroll /
 * type step fails. With the flag off this fixture does nothing at all.
 */
export const aiFlakyRecoveryFixture: Fixtures<
  TestLevelFixtures,
  WorkerLevelFixtures
> = {
  aiFlakyRecovery: [
    // `runTest` rather than the conventional `use`, which ESLint reads as React's
    // `use()` hook and rejects inside a try/catch (`rules-of-hooks`).
    async (
      {}, // eslint-disable-line no-empty-pattern
      runTest: () => Promise<void>,
      testInfo: TestInfo,
    ): Promise<void> => {
      if (
        !isFlakyRecoveryEnabled() ||
        isPerformanceTest(testInfo.titlePath, testInfo.tags)
      ) {
        await runTest();
        return;
      }

      const provider = createClaudeFlakyRecoveryProvider();
      if (!provider) {
        logger.warn(
          'AI flaky recovery requested but the provider could not start',
        );
        await runTest();
        return;
      }

      const limits = resolveFlakyRecoveryLimits();
      logger.info(
        `AI flaky recovery enabled (max ${limits.maxRecoveriesPerTest} recoveries, ${limits.maxDiagnosesPerTest} diagnoses per test)`,
      );
      interruptingScreenGuard.configure({
        flakyRecovery: new FlakyRecoveryRuntime({
          provider,
          executor: appiumFlakyFixExecutor,
          limits,
          test: {
            title: testInfo.title,
            file: testInfo.titlePath[0] ?? testInfo.file,
            retry: testInfo.retry,
          },
          onRecovered: async (record, screenshots) => {
            await publishFlakyRecovery(testInfo, record, screenshots);
          },
        }),
      });

      try {
        await runTest();
      } finally {
        interruptingScreenGuard.configure(undefined);
      }
    },
    { auto: true },
  ],
};
