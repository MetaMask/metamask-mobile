import type { Fixtures, TestInfo } from '@playwright/test';
import {
  startAppProfilingFromTest,
  stopAndCollectAppProfiling,
} from '../../../performance/helpers/appProfiling.ts';
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

      let profilingStarted = false;
      try {
        await startAppProfilingFromTest();
        profilingStarted = true;
      } catch (error) {
        logger.warn(
          `Could not start Hermes profiling for "${testInfo.title}"; continuing without profiling: ${String(error)}`,
        );
      }

      let testError: unknown;
      try {
        await use();
      } catch (error) {
        testError = error;
      }

      if (profilingStarted) {
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
