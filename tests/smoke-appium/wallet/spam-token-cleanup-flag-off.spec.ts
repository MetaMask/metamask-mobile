import type { Mockttp } from 'mockttp';
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { applyTokenHoldingsMocks } from '../../api-mocking/mock-responses/pay/holdings-mocks.js';
import { mockOccurrenceApis } from '../../api-mocking/mock-responses/spam-token-cleanup-mocks.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import TokensFullView from '../../page-objects/wallet/HomeSections.js';
import NetworkManager from '../../page-objects/wallet/NetworkManager.js';
import {
  buildFixture,
  SPAM_ASSETS,
  ALL_HOLDINGS,
  CLEANUP_DISABLED_OVERRIDE,
} from './spam-token-cleanup.helpers.js';

appiumTest.describe(
  SmokeWalletPlatform('Spam token cleanup - flag off'),
  () => {
    appiumTest(
      'leaves persisted spam tokens untouched when the cleanup flag is off',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: buildFixture(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: async (mockServer: Mockttp) => {
              await setupRemoteFeatureFlagsMock(
                mockServer,
                CLEANUP_DISABLED_OVERRIDE,
              );
              await mockOccurrenceApis(mockServer);
              await applyTokenHoldingsMocks(mockServer, ALL_HOLDINGS);
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await WalletView.tapOnNewTokensSection();
            await TokensFullView.waitForVisible();

            // With useUnlockCleanup off the cleanup must not run, so even the
            // below-floor spam tokens survive unlock.
            for (const { symbol } of SPAM_ASSETS) {
              await NetworkManager.scrollToToken(symbol);
              await NetworkManager.checkTokenExists(symbol);
            }
          },
        );
      },
    );
  },
);
