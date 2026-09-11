import type { Fixtures, TestInfo } from '@playwright/test';
import {
  collectAppProfilingBeforeAppTerminate,
  resetAppProfilingSegments,
  startAppProfilingFromTest,
  stopAndCollectAppProfiling,
} from '../../../performance/helpers/appProfiling.ts';
import { onBeforeAppTerminate } from '../../appLifecycle.ts';
import { createAppiumLogger } from '../../appiumLogger.ts';
import type {
  CurrentDeviceDetails,
  TestLevelFixtures,
  WorkerLevelFixtures,
} from './types.ts';

function isPerformanceTest(testInfo: TestInfo): boolean {
  return /[\\/]tests[\\/]performance[\\/]/.test(testInfo.file);
}

const logger = createAppiumLogger('appProfiling');

/**
 * Wraps every performance spec in a Hermes CPU profiling session: started
 * before the test body (so it covers login) and stopped after the last
 * assertion.
 *
 * A session cannot outlive the app process that opened it, so specs that
 * restart the app flush their profile through the before-terminate hook and the
 * final stop becomes a no-op. Those specs still produce a trace; it covers the
 * work leading up to the restart rather than the restart itself.
 */
export const appProfilingFixture: Fixtures<
  TestLevelFixtures,
  WorkerLevelFixtures
> = {
  appProfiling: [
    async (
      {
        driver: _driver,
        currentDeviceDetails,
      }: {
        driver: WebdriverIO.Browser;
        currentDeviceDetails: CurrentDeviceDetails;
      },
      use: () => Promise<void>,
      testInfo: TestInfo,
    ) => {
      if (!isPerformanceTest(testInfo)) {
        await use();
        return;
      }

      resetAppProfilingSegments();

      let profilingStarted = false;
      try {
        await startAppProfilingFromTest();
        profilingStarted = true;
      } catch (error) {
        logger.warn(
          `Could not start Hermes profiling for "${testInfo.title}"; continuing without profiling: ${String(error)}`,
        );
      }

      let flushedBeforeTerminate = false;
      const removeTerminateHook = onBeforeAppTerminate(async () => {
        flushedBeforeTerminate =
          (await collectAppProfilingBeforeAppTerminate(
            testInfo,
            currentDeviceDetails.platform,
          )) || flushedBeforeTerminate;
      });

      let testError: unknown;
      try {
        await use();
      } catch (error) {
        testError = error;
      } finally {
        removeTerminateHook();
      }

      if (profilingStarted && flushedBeforeTerminate) {
        logger.info(
          `Hermes profile for "${testInfo.title}" was collected before the app restart; nothing left to stop`,
        );
      } else if (profilingStarted) {
        try {
          await stopAndCollectAppProfiling(
            testInfo,
            currentDeviceDetails.platform,
          );
        } catch (error) {
          logger.warn(
            `Could not collect Hermes profiling for "${testInfo.title}"; preserving test result: ${String(error)}`,
          );
        }
      }

      if (testError) {
        throw testError;
      }
    },
    { auto: true },
  ],
};
