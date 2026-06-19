import type { FullProject, TestInfo } from '@playwright/test';
import { createServiceProvider, type ServiceProvider } from '../../services';
import type { WebDriverConfig } from '../../types.ts';
import { createPlaywrightLogger } from '../../playwrightLogger.ts';
import type { TestLevelFixtures } from './types.ts';

const logger = createPlaywrightLogger('deviceProvider');

export const deviceProviderFixture = {
  deviceProvider: async (
    { commandQueueServer }: Pick<TestLevelFixtures, 'commandQueueServer'>,
    use: (deviceProvider: ServiceProvider) => Promise<void>,
    testInfo: TestInfo,
  ) => {
    void commandQueueServer;
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
