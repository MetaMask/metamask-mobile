import { test as base, FullProject } from '@playwright/test';
import { WebDriverConfig } from '../../e2e/framework';
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

export const test = base.extend<TestLevelFixtures>({
  // eslint-disable-next-line no-empty-pattern
  deviceProvider: async ({}, use, testInfo) => {
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
});
