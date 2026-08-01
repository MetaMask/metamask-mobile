import type { FullProject, TestInfo } from '@playwright/test';
import type { WebDriverConfig } from '../../types.ts';
import { DEFAULT_IMPLICIT_WAIT_MS } from '../../Constants.ts';
import { setDeviceInfo } from '../../DeviceInfoCache.ts';
import type { SharedAppiumSession, WorkerLevelFixtures } from './types.ts';
import {
  isVideoRecordingOnFailureEnabled,
  startFailureRecording,
  stopFailureRecordingAndAttach,
} from '../../services/appium/ScreenRecording.ts';
import { isSessionAlive } from '../../services/appium/sessionHealth.ts';
import { createPlaywrightLogger } from '../../playwrightLogger.ts';
import { FrameworkDetector, TestFramework } from '../../FrameworkDetector.ts';
import UnifiedGestures from '../../UnifiedGestures.ts';
import type { ServiceProvider } from '../../services';
import { isAppiumSessionReuseEnabled } from './sessionReuse.ts';

const logger = createPlaywrightLogger('driver');

async function configureImplicitWait(
  drv: WebdriverIO.Browser,
  implicitMs: number,
): Promise<void> {
  // Wrapped in retry because BrowserStack sessions can transiently reject
  // the setTimeout command before the session is fully initialised.
  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await drv.setTimeout({ implicit: implicitMs });
      return;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const backoff = Math.min(2 ** attempt * 1000, 15000);
      logger.warn(
        `driver.setTimeout failed (attempt ${attempt}/${maxRetries}), retrying in ${backoff}ms`,
      );
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

async function createSession(
  deviceProvider: ServiceProvider,
  sharedSession: SharedAppiumSession,
): Promise<WebdriverIO.Browser> {
  const drv = await deviceProvider.getDriver();
  sharedSession.drv = drv;
  return drv;
}

export const driverFixture = {
  driver: async (
    {
      deviceProvider,
      sharedSession,
    }: Pick<WorkerLevelFixtures, 'deviceProvider' | 'sharedSession'>,
    use: (drv: WebdriverIO.Browser) => Promise<void>,
    testInfo: TestInfo,
  ) => {
    let drv: WebdriverIO.Browser | undefined;
    let recordingBackend: Awaited<ReturnType<typeof startFailureRecording>>;
    const project = testInfo.project as FullProject<WebDriverConfig>;
    const platform = project.use.platform;
    const reuseEnabled = isAppiumSessionReuseEnabled(project.use);
    const recordVideoOnFailure = isVideoRecordingOnFailureEnabled(
      project.use.device?.provider,
    );

    let sessionReused = false;
    let sessionRecreated = false;

    try {
      if (reuseEnabled && sharedSession.drv) {
        const alive = await isSessionAlive(sharedSession.drv);
        if (alive) {
          drv = sharedSession.drv;
          sessionReused = true;
          logger.info(
            `Reusing WebDriver session sessionId=${deviceProvider.sessionId ?? sharedSession.drv.sessionId ?? 'unknown'} for "${testInfo.title}"`,
          );
        } else {
          logger.warn(
            `Shared WebDriver session is unhealthy; recreating for "${testInfo.title}"`,
          );
          try {
            await deviceProvider.cleanupSession?.(sharedSession.drv);
          } catch (error) {
            logger.error(
              'Failed to cleanup unhealthy session before recreate:',
              error,
            );
          }
          sharedSession.drv = undefined;
          sessionRecreated = true;
          drv = await createSession(deviceProvider, sharedSession);
        }
      } else {
        logger.info(
          `${reuseEnabled ? 'Starting' : 'Starting (reuse off)'} WebDriver session for "${testInfo.title}" (project: ${project.name})`,
        );
        drv = await createSession(deviceProvider, sharedSession);
      }

      const implicitMs = project.use.expectTimeout ?? DEFAULT_IMPLICIT_WAIT_MS;
      await configureImplicitWait(drv, implicitMs);

      globalThis.driver = drv;
      FrameworkDetector.reset();
      FrameworkDetector.setFramework(TestFramework.APPIUM);
      UnifiedGestures.resetStrategy();

      const platformName = (await drv.capabilities)?.platformName;
      const windowSize = await drv.getWindowSize();
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
          `implicitWait=${implicitMs}ms, provider=${deviceProviderName ?? 'unknown'}, ` +
          `sessionReused=${sessionReused}, sessionRecreated=${sessionRecreated}` +
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
        {
          type: 'sessionReused',
          description: String(sessionReused),
        },
        {
          type: 'sessionRecreated',
          description: String(sessionRecreated),
        },
      );

      try {
        await deviceProvider.syncTestDetails?.({ name: testInfo.title });
      } catch (error) {
        logger.error('Failed to sync pre-test details:', error);
      }

      if (recordVideoOnFailure) {
        recordingBackend = await startFailureRecording(drv, platform);
      }

      await use(drv);
    } finally {
      const testStatus = testInfo.status;
      const testError = testInfo.error?.message;

      logger.info(
        `Tearing down driver fixture for "${testInfo.title}" (status: ${testStatus ?? 'unknown'}, reuse=${reuseEnabled})`,
      );

      try {
        if (drv) {
          await stopFailureRecordingAndAttach(
            drv,
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

      if (!reuseEnabled) {
        try {
          if (drv) {
            if (deviceProvider.cleanupSession) {
              await deviceProvider.cleanupSession(drv);
            } else {
              await drv.deleteSession();
              logger.info('WebDriver session deleted');
            }
          }
        } catch (error) {
          logger.error('Failed to delete WebDriver session:', error);
        } finally {
          sharedSession.drv = undefined;
        }

        try {
          delete globalThis.driver;
          FrameworkDetector.reset();
          UnifiedGestures.resetStrategy();
        } catch (error) {
          logger.error('Failed to clean up global driver:', error);
        }
        // Appium server stop is deferred to worker sharedSession teardown
        // (cleanupProvider) so local runs do not depend on SKIP_APPIUM_STOP.
      }
    }
  },
};
