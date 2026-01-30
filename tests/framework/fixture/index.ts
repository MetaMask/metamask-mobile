import { test as base, type FullProject } from '@playwright/test';
import { WebDriverConfig } from '../types.ts';
import { createServiceProvider, type ServiceProvider } from '../services';

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
  deviceProvider: ServiceProvider;

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
    const deviceProvider = createServiceProvider(testInfo.project);
    await use(deviceProvider);
  },

  driver: async ({ deviceProvider }, use, testInfo) => {
    let driver: WebdriverIO.Browser | undefined;

    try {
      // Create driver and set up test context
      driver = await deviceProvider.getDriver();

      // Make driver globally accessible for utilities
      globalThis.driver = driver;

      // Add test metadata as annotations
      const deviceProviderName = (
        testInfo.project as FullProject<WebDriverConfig>
      ).use.device?.provider;

      testInfo.annotations.push(
        {
          type: 'providerName',
          description: deviceProviderName || 'unknown',
        },
        {
          type: 'sessionId',
          description: deviceProvider.sessionId || 'no-session',
        },
      );

      try {
        await deviceProvider.syncTestDetails?.({ name: testInfo.title });
      } catch (error) {
        console.error('Failed to sync pre-test details:', error);
      }

      // Run the test
      await use(driver);
    } finally {
      // Cleanup happens even if test fails
      const testStatus = testInfo.status;
      const testError = testInfo.error?.message;

      try {
        // Sync final test status to provider (e.g., BrowserStack dashboard)
        // This must happen BEFORE session deletion to ensure reliable status reporting
        await deviceProvider.syncTestDetails?.({
          name: testInfo.title,
          status: testStatus,
          reason: testError,
        });
      } catch (error) {
        console.error('Failed to sync test details:', error);
      }

      try {
        // Close WebDriver session
        if (driver) {
          await driver.deleteSession();
        }
      } catch (error) {
        console.error('Failed to delete WebDriver session:', error);
      }

      try {
        // Clean up global driver reference
        delete globalThis.driver;
      } catch (error) {
        console.error('Failed to clean up global driver:', error);
      }

      try {
        // Provider-specific cleanup (e.g., stop Appium server for emulator)
        await deviceProvider.cleanup?.();
      } catch (error) {
        console.error('Provider cleanup failed:', error);
      }
    }
  },
});
