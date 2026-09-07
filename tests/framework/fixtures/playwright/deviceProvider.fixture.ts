import type { Fixtures, FullProject, WorkerInfo } from '@playwright/test';
import { createServiceProvider, type ServiceProvider } from '../../services';
import {
  Platform,
  type EmulatorConfig,
  type WebDriverConfig,
} from '../../types.ts';
import { createAppiumLogger } from '../../appiumLogger.ts';
import type { SharedAppiumSession, WorkerLevelFixtures } from './types.ts';
import { applyAndroidDevicePoolToWorker } from '../../services/providers/emulator/android/androidDevicePool.ts';
import { applyIosDevicePoolToWorker } from '../../services/providers/emulator/ios/iosDevicePool.ts';

const logger = createAppiumLogger('deviceProvider');
const IOS_WORKER_ENV_KEYS = [
  'IOS_SIMULATOR_UDID',
  'E2E_WORKER_INDEX',
  'IOS_WDA_LOCAL_PORT',
  'IOS_MJPEG_SERVER_PORT',
] as const;

/**
 * Worker-scoped provider + mutable session holder.
 * Session create/delete for reuse lives in the test-scoped `driver` fixture;
 * this fixture only creates the provider once and tears down session+server
 * at worker end.
 */
export const workerDeviceProviderFixture: Fixtures<
  // No test-scoped fixtures declared here.
  object,
  WorkerLevelFixtures
> = {
  deviceProvider: [
    async (
      {}, // eslint-disable-line no-empty-pattern
      use: (deviceProvider: ServiceProvider) => Promise<void>,
      workerInfo: WorkerInfo,
    ) => {
      const project = workerInfo.project as FullProject<WebDriverConfig>;
      const providerName = project.use.device?.provider ?? 'unknown';
      const originalIosWorkerEnv =
        project.use.platform === Platform.IOS
          ? (Object.fromEntries(
              IOS_WORKER_ENV_KEYS.map((key) => [key, process.env[key]]),
            ) as Record<
              (typeof IOS_WORKER_ENV_KEYS)[number],
              string | undefined
            >)
          : undefined;

      try {
        if (project.use.platform === Platform.ANDROID) {
          const assignment = applyAndroidDevicePoolToWorker(
            workerInfo.parallelIndex,
          );
          if (assignment) {
            (project.use.device as EmulatorConfig).udid = assignment.serial;
            logger.info(
              `Android pool worker ${workerInfo.parallelIndex}: ` +
                `serial=${assignment.serial}, systemPort=${assignment.systemPort}`,
            );
          }
        }

        if (project.use.platform === Platform.IOS) {
          const assignment = applyIosDevicePoolToWorker(
            workerInfo.parallelIndex,
          );
          if (assignment) {
            (project.use.device as EmulatorConfig).udid = assignment.udid;
            logger.info(
              `iOS pool worker ${workerInfo.parallelIndex}: ` +
                `udid=${assignment.udid}, wdaLocalPort=${assignment.wdaLocalPort}`,
            );
          }
        }

        logger.info(
          `Creating worker-scoped device provider "${providerName}" for project "${project.name}"`,
        );

        const deviceProvider = createServiceProvider(project);
        await use(deviceProvider);

        logger.info(
          `Worker device provider "${providerName}" fixture ended (sessionId=${deviceProvider.sessionId ?? 'none'})`,
        );
      } finally {
        if (originalIosWorkerEnv) {
          for (const key of IOS_WORKER_ENV_KEYS) {
            const originalValue = originalIosWorkerEnv[key];
            if (originalValue === undefined) {
              delete process.env[key];
            } else {
              process.env[key] = originalValue;
            }
          }
        }
      }
    },
    { scope: 'worker' },
  ],

  sharedSession: [
    async (
      { deviceProvider }: { deviceProvider: ServiceProvider },
      use: (sharedSession: SharedAppiumSession) => Promise<void>,
    ) => {
      const sharedSession: SharedAppiumSession = {};
      await use(sharedSession);

      logger.info(
        'Worker sharedSession teardown: cleanupSession then cleanupProvider',
      );

      try {
        if (sharedSession.drv) {
          await deviceProvider.cleanupSession?.(sharedSession.drv);
        } else {
          await deviceProvider.cleanupSession?.();
        }
      } catch (error) {
        logger.error('Worker cleanupSession failed:', error);
      } finally {
        sharedSession.drv = undefined;
      }

      try {
        delete globalThis.driver;
      } catch (error) {
        logger.error(
          'Failed to clear global driver on worker teardown:',
          error,
        );
      }

      try {
        if (deviceProvider.cleanupProvider) {
          await deviceProvider.cleanupProvider();
        } else {
          await deviceProvider.cleanup?.();
        }
      } catch (error) {
        logger.error('Worker cleanupProvider failed:', error);
      }
    },
    { scope: 'worker' },
  ],
};
