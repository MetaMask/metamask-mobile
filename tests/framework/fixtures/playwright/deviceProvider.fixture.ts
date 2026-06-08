import type { FullProject, TestInfo } from '@playwright/test';
import { createServiceProvider, type ServiceProvider } from '../../services';
import type { WebDriverConfig } from '../../types.ts';
import { createPlaywrightLogger } from '../../playwrightLogger.ts';

const logger = createPlaywrightLogger('deviceProvider');

export const deviceProviderFixture = {
  deviceProvider: async (
    {}, // eslint-disable-line no-empty-pattern
    use: (deviceProvider: ServiceProvider) => Promise<void>,
    testInfo: TestInfo,
  ) => {
    const project = testInfo.project as FullProject<WebDriverConfig>;
    const providerName = project.use.device?.provider ?? 'unknown';

    logger.info(
      `Creating device provider "${providerName}" for project "${project.name}"`,
    );

    const deviceProvider = createServiceProvider(project);

    await use(deviceProvider);

    logger.info(
      `Device provider "${providerName}" teardown complete (sessionId=${deviceProvider.sessionId ?? 'none'})`,
    );
  },
};
