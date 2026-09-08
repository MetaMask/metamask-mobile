import type { Fixtures, TestInfo } from '@playwright/test';
import {
  startAppProfilingFromTest,
  stopAndCollectAppProfiling,
} from '../../../performance/helpers/appProfiling.ts';
import type {
  CurrentDeviceDetails,
  TestLevelFixtures,
  WorkerLevelFixtures,
} from './types.ts';

function isPerformanceTest(testInfo: TestInfo): boolean {
  return /[\\/]tests[\\/]performance[\\/]/.test(testInfo.file);
}

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

      await startAppProfilingFromTest();
      let testError: unknown;
      let profilingError: unknown;
      try {
        await use();
      } catch (error) {
        testError = error;
      }

      try {
        await stopAndCollectAppProfiling(
          testInfo,
          currentDeviceDetails.platform,
        );
      } catch (error) {
        profilingError = error;
      }

      if (testError) {
        throw testError;
      }
      if (profilingError) {
        throw profilingError;
      }
    },
    { auto: true },
  ],
};
