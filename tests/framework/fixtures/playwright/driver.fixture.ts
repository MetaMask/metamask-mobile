import type { FullProject, TestInfo } from '@playwright/test';
import { WebDriverConfig } from '../../types.ts';
import { DEFAULT_IMPLICIT_WAIT_MS } from '../../Constants.ts';
import { setDeviceInfo } from '../../DeviceInfoCache.ts';
import type { TestLevelFixtures } from './types.ts';

export const driverFixture = {
  driver: async (
    { deviceProvider }: Pick<TestLevelFixtures, 'deviceProvider'>,
    use: (driver: WebdriverIO.Browser) => Promise<void>,
    testInfo: TestInfo,
  ) => {
    let driver: WebdriverIO.Browser | undefined;
    const project = testInfo.project as FullProject<WebDriverConfig>;

    try {
      driver = await deviceProvider.getDriver();

      // Wrapped in retry because BrowserStack sessions can transiently reject
      // the setTimeout command before the session is fully initialised.
      const implicitMs = project.use.expectTimeout ?? DEFAULT_IMPLICIT_WAIT_MS;
      const maxRetries = 5;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await driver.setTimeout({ implicit: implicitMs });
          break;
        } catch (err) {
          if (attempt === maxRetries) throw err;
          const backoff = Math.min(2 ** attempt * 1000, 15000);
          console.warn(
            `driver.setTimeout failed (attempt ${attempt}/${maxRetries}), retrying in ${backoff}ms…`,
          );
          await new Promise((r) => setTimeout(r, backoff));
        }
      }

      globalThis.driver = driver;

      const platformName = (await driver.capabilities)?.platformName;
      const windowSize = await driver.getWindowSize();
      setDeviceInfo(
        (platformName?.toLowerCase() === 'android' ? 'android' : 'ios') as
          | 'android'
          | 'ios',
        { width: windowSize.width, height: windowSize.height },
      );

      const deviceProviderName = project.use.device?.provider;

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

      await use(driver);
    } finally {
      const testStatus = testInfo.status;
      const testError = testInfo.error?.message;

      try {
        await deviceProvider.syncTestDetails?.({
          name: testInfo.title,
          status: testStatus,
          reason: testError,
        });
      } catch (error) {
        console.error('Failed to sync test details:', error);
      }

      try {
        if (driver) {
          await driver.deleteSession();
        }
      } catch (error) {
        console.error('Failed to delete WebDriver session:', error);
      }

      try {
        delete globalThis.driver;
      } catch (error) {
        console.error('Failed to clean up global driver:', error);
      }

      try {
        await deviceProvider.cleanup?.();
      } catch (error) {
        console.error('Provider cleanup failed:', error);
      }
    }
  },
};
