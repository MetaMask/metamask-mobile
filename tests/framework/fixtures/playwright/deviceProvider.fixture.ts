import type { Fixtures, FullProject, WorkerInfo } from '@playwright/test';
import { createServiceProvider, type ServiceProvider } from '../../services';
import type { WebDriverConfig } from '../../types.ts';
import { createAppiumLogger } from '../../appiumLogger.ts';
import type { SharedAppiumSession, WorkerLevelFixtures } from './types.ts';

const logger = createAppiumLogger('deviceProvider');

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

      logger.info(
        `Creating worker-scoped device provider "${providerName}" for project "${project.name}"`,
      );

      const deviceProvider = createServiceProvider(project);
      await use(deviceProvider);

      logger.info(
        `Worker device provider "${providerName}" fixture ended (sessionId=${deviceProvider.sessionId ?? 'none'})`,
      );
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
