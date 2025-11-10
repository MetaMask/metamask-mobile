import { test as base, FullProject } from '@playwright/test';
import { WebDriverConfig } from '../../e2e/framework/types';
import { DeviceProvider } from '../services/common/interfaces/DeviceProvider';
import { createDeviceProvider } from '../services';
import { stopAppiumServer } from '../services/common/AppiumHelpers';

// Extend globalThis to include driver property
declare global {
  // eslint-disable-next-line no-var
  var driver: WebdriverIO.Browser | undefined;
}

interface TestLevelFixtures {
  /**
   * Device provider to be used for the test.
   * This creates and manages the device lifecycle for the test
   */
  deviceProvider: DeviceProvider;

  /**
   * The device instance that will be used for running the test.
   * This provides the functionality to interact with the device
   * during the test.
   */
  driver: WebdriverIO.Browser;
}

// interface WorkerLevelFixtures {
//   persistentDevice: Client;
// }

export const test = base.extend<TestLevelFixtures>({
  // TODO: fix _ for {} in the future. Using {} is causing linter errors
  deviceProvider: async (_, use, testInfo) => {
    const deviceProvider = createDeviceProvider(testInfo.project);
    await use(deviceProvider);
  },
  driver: async ({ deviceProvider }, use, testInfo) => {
    const driver = (await deviceProvider.getDriver()) as WebdriverIO.Browser;
    // Make driver globally accessible
    globalThis.driver = driver;
    const deviceProviderName = (
      testInfo.project as FullProject<WebDriverConfig>
    ).use.device?.provider;
    testInfo.annotations.push({
      type: 'providerName',
      description: deviceProviderName,
    });
    testInfo.annotations.push({
      type: 'sessionId',
      description: deviceProvider.sessionId,
    });
    await deviceProvider.syncTestDetails?.({ name: testInfo.title });
    await use(driver);
    await driver.deleteSession();
    // Clean up global driver reference
    delete globalThis.driver;
    if (deviceProviderName === 'emulator') {
      await stopAppiumServer();
    }
    await deviceProvider.syncTestDetails?.({
      name: testInfo.title,
      status: testInfo.status,
      reason: testInfo.error?.message,
    });
  },
  //   persistentDevice: [
  //     async ({}, use, workerInfo) => {
  //       const { project, workerIndex } = workerInfo;
  //       const beforeSession = new Date();
  //       const deviceProvider = createDeviceProvider(project);
  //       const driver = await deviceProvider.getDriver() as Client;
  //       const sessionId = deviceProvider.sessionId;
  //       if (!sessionId) {
  //         throw new Error("Worker must have a sessionId.");
  //       }
  //       const providerName = (project as FullProject<WebDriverConfig>).use.device
  //         ?.provider;
  //       const afterSession = new Date();
  //     //   const workerInfoStore = new WorkerInfoStore();
  //     //   await workerInfoStore.saveWorkerStartTime(
  //     //     workerIndex,
  //     //     sessionId,
  //     //     providerName!,
  //     //     beforeSession,
  //     //     afterSession,
  //     //   );
  //     //   await use(driver);
  //     //   await workerInfoStore.saveWorkerEndTime(workerIndex, new Date());
  //       await driver.close();
  //     },
  //     { scope: "worker" },
  //   ],
});

/**
 * Function to extend Playwright’s expect assertion capabilities.
 * This adds a new method `toBeVisible` which checks if an element is visible on the screen.
 *
 * @param locator The AppwrightLocator that locates the element on the device screen.
 * @param options
 * @returns
 */
// export const expect = test.expect.extend({
//   toBeVisible: async (locator: AppwrightLocator, options?: ActionOptions) => {
//     const isVisible = await locator.isVisible(options);
//     return {
//       message: () => (isVisible ? "" : `Element was not found on the screen`),
//       pass: isVisible,
//       name: "toBeVisible",
//       expected: true,
//       actual: isVisible,
//     };
//   },
// });
