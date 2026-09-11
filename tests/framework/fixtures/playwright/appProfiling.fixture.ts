import type { Fixtures, TestInfo } from '@playwright/test';
import {
  collectAppProfiling,
  resetAppProfilingSegments,
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
 * Collects a Hermes CPU profile for every performance spec.
 *
 * Nothing here starts profiling: the app arms itself on startup, so the trace
 * covers the launch the launch-time specs measure, and a spec that restarts the
 * app gets the new process profiled for free. This fixture only decides when to
 * harvest what the app has recorded.
 *
 * A session cannot outlive the process that opened it, so specs that kill the
 * app have to be harvested first — `terminateApp` runs the before-terminate
 * hooks, and the one registered here flushes the in-flight trace while the
 * process is still alive.
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

      const removeTerminateHook = onBeforeAppTerminate(async () => {
        await collectAppProfiling(testInfo, currentDeviceDetails.platform);
      });

      let testError: unknown;
      try {
        await use();
      } catch (error) {
        testError = error;
      } finally {
        removeTerminateHook();
      }

      try {
        await collectAppProfiling(testInfo, currentDeviceDetails.platform);
      } catch (error) {
        logger.warn(
          `Could not collect Hermes profiling for "${testInfo.title}"; preserving test result: ${String(error)}`,
        );
      }

      if (testError) {
        throw testError;
      }
    },
    { auto: true },
  ],
};
