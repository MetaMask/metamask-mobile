import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { TestSuiteParams } from '../../framework/types.js';
import {
  assertInAppStateExportOmitsSensitiveFields,
  mockUserStorage,
  waitForProfileSession,
  waitForSeededState,
} from './state-export-sanitization.helpers.js';

appiumTest.describe(SmokeWalletPlatform('State export sanitization'), () => {
  appiumTest.describe.configure({ timeout: 240000 });

  appiumTest(
    'omits sensitive material from the in-app state export',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withBackupAndSyncSettings()
            .withStateLogOmittedFields()
            .build(),
          restartDevice: true,
          currentDeviceDetails,
          useCommandQueueServer: true,
          testSpecificMock: mockUserStorage,
        },
        async ({ commandQueueServer }: TestSuiteParams) => {
          if (!commandQueueServer) {
            throw new Error('Command queue server not available');
          }

          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await waitForProfileSession(commandQueueServer);
          await waitForSeededState(commandQueueServer);
          await assertInAppStateExportOmitsSensitiveFields(commandQueueServer);
        },
      );
    },
  );
});
