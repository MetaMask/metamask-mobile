import type { FullProject, TestInfo } from '@playwright/test';
import { SrpProfile, TestType, type WebDriverConfig } from '../../types.ts';
import { FALLBACK_COMMAND_QUEUE_SERVER_PORT } from '../../Constants.ts';
import CommandQueueServer from '../CommandQueueServer.ts';
import { PlatformDetector } from '../../PlatformLocator.ts';
import { createPlaywrightLogger } from '../../playwrightLogger.ts';
import type { CurrentDeviceDetails, TestLevelFixtures } from './types.ts';

const logger = createPlaywrightLogger('commandQueueServer');

export const commandQueueServerFixture = {
  commandQueueServer: async (
    { currentDeviceDetails }: Pick<TestLevelFixtures, 'currentDeviceDetails'>,
    use: (server: CommandQueueServer | null) => Promise<void>,
    testInfo: TestInfo,
  ) => {
    const project = testInfo.project as FullProject<WebDriverConfig>;
    if (project.use.testContext?.testType !== TestType.PERFORMANCE) {
      await use(null);
      return;
    }

    const srpProfile = project.use.testContext?.srpProfile as SrpProfile;
    const platform = currentDeviceDetails.platform;
    if (platform === 'android' || platform === 'ios') {
      PlatformDetector.setPlatform(platform);
    }

    const server = new CommandQueueServer();
    server.setServerPort(FALLBACK_COMMAND_QUEUE_SERVER_PORT);
    if (
      currentDeviceDetails.isBrowserstack &&
      currentDeviceDetails.platform === 'ios'
    ) {
      server.enableHttps(
        'tests/framework/fixtures/certs/server.crt',
        'tests/framework/fixtures/certs/server.key',
      );
    }
    await server.start();
    server.setSrpProfile(srpProfile);

    logger.info(
      `Command queue server started on port ${server.getServerPort()} with srpProfile=${srpProfile}`,
    );
    await use(server);
    await server.stop();
    logger.info('Command queue server stopped');
  },
};
