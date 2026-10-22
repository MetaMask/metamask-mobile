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
} from './spam-token-cleanup.helpers.js';

appiumTest.describe(
  SmokeWalletPlatform('Spam token cleanup - API failure'),
  () => {
    appiumTest(
      'leaves persisted spam tokens untouched when the occurrence floor API fails',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: buildFixture(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: async (mockServer: Mockttp) => {
              // Default mocks already enable useUnlockCleanup.
              await setupRemoteFeatureFlagsMock(mockServer, {});
              await mockOccurrenceApis(mockServer, {
                failOccurrenceFloors: true,
              });
              await applyTokenHoldingsMocks(mockServer, ALL_HOLDINGS);
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await WalletView.tapOnNewTokensSection();
            await TokensFullView.waitForVisible();

            // Every spam row must still be held: a failed floor lookup must never
            // be read as "no floor", which would delete the whole set.
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
