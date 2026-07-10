import type { FullProject, TestInfo } from '@playwright/test';
import type { WebDriverConfig } from '../../types.ts';
import { DEFAULT_IMPLICIT_WAIT_MS } from '../../Constants.ts';
import { setDeviceInfo } from '../../DeviceInfoCache.ts';
import type { TestLevelFixtures } from './types.ts';
import {
  isVideoRecordingOnFailureEnabled,
  startFailureRecording,
  stopFailureRecordingAndAttach,
} from '../../services/appium/ScreenRecording.ts';
import { createPlaywrightLogger } from '../../playwrightLogger.ts';
import { FrameworkDetector, TestFramework } from '../../FrameworkDetector.ts';
import UnifiedGestures from '../../UnifiedGestures.ts';

const logger = createPlaywrightLogger('driver');

export const driverFixture = {
  driver: async (
    { deviceProvider }: Pick<TestLevelFixtures, 'deviceProvider'>,
    use: (driver: WebdriverIO.Browser) => Promise<void>,
    testInfo: TestInfo,
  ) => {
    let driver: WebdriverIO.Browser | undefined;
    let recordingBackend: Awaited<ReturnType<typeof startFailureRecording>>;
    const project = testInfo.project as FullProject<WebDriverConfig>;
    const platform = project.use.platform;
    const recordVideoOnFailure = isVideoRecordingOnFailureEnabled(
      project.use.device?.provider,
    );

    try {
      logger.info(
        `Starting WebDriver session for "${testInfo.title}" (project: ${project.name})`,
      );

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
          logger.warn(
            `driver.setTimeout failed (attempt ${attempt}/${maxRetries}), retrying in ${backoff}ms`,
          );
          await new Promise((r) => setTimeout(r, backoff));
        }
      }

      globalThis.driver = driver;
      FrameworkDetector.reset();
      FrameworkDetector.setFramework(TestFramework.APPIUM);
      UnifiedGestures.resetStrategy();

      const platformName = (await driver.capabilities)?.platformName;
      const windowSize = await driver.getWindowSize();
      setDeviceInfo(
        (platformName?.toLowerCase() === 'android' ? 'android' : 'ios') as
          | 'android'
          | 'ios',
        { width: windowSize.width, height: windowSize.height },
      );

      const deviceProviderName = project.use.device?.provider;

      logger.info(
        `WebDriver session ready: sessionId=${deviceProvider.sessionId ?? 'unknown'}, ` +
          `platform=${platformName ?? 'unknown'}, ` +
          `screen=${windowSize.width}x${windowSize.height}, ` +
          `implicitWait=${implicitMs}ms, provider=${deviceProviderName ?? 'unknown'}` +
          (deviceProvider.sessionCreationDurationMs !== undefined
            ? `, sessionCreation=${deviceProvider.sessionCreationDurationMs}ms`
            : ''),
      );

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
        logger.error('Failed to sync pre-test details:', error);
      }

      if (recordVideoOnFailure) {
        recordingBackend = await startFailureRecording(driver, platform);
      }

      await use(driver);
    } finally {
      const testStatus = testInfo.status;
      const testError = testInfo.error?.message;

      logger.info(
        `Tearing down WebDriver session for "${testInfo.title}" (status: ${testStatus ?? 'unknown'})`,
      );

      try {
        if (driver) {
          await stopFailureRecordingAndAttach(
            driver,
            testInfo,
            recordingBackend,
            platform,
          );
        }
      } catch (error) {
        console.error('Failed to stop/attach failure screen recording:', error);
      }

      try {
        await deviceProvider.syncTestDetails?.({
          name: testInfo.title,
          status: testStatus,
          reason: testError,
        });
      } catch (error) {
        logger.error('Failed to sync test details:', error);
      }

      try {
        if (driver) {
          await driver.deleteSession();
          logger.info('WebDriver session deleted');
        }
      } catch (error) {
        logger.error('Failed to delete WebDriver session:', error);
      }

      try {
        delete globalThis.driver;
        FrameworkDetector.reset();
        UnifiedGestures.resetStrategy();
      } catch (error) {
        logger.error('Failed to clean up global driver:', error);
      }

      try {
        await deviceProvider.cleanup?.();
      } catch (error) {
        logger.error('Provider cleanup failed:', error);
      }
    }
  },
};
