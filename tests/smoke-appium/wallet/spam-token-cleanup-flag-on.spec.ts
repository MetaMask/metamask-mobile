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
  LEGITIMATE_ASSET,
  CUSTOM_ASSET,
  SURVIVOR_HOLDINGS,
  CLEANUP_TIMEOUT_MS,
} from './spam-token-cleanup.helpers.js';

appiumTest.describe(SmokeWalletPlatform('Spam token cleanup - flag on'), () => {
  appiumTest(
    'removes below-floor spam tokens from persisted state on unlock when the cleanup flag is on',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildFixture(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: async (mockServer: Mockttp) => {
            // Default mocks already enable useUnlockCleanup.
            await setupRemoteFeatureFlagsMock(mockServer, {});
            await mockOccurrenceApis(mockServer);
            // Survivors only — refresh must not reintroduce cleaned spam.
            await applyTokenHoldingsMocks(mockServer, SURVIVOR_HOLDINGS);
          },
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await WalletView.tapOnNewTokensSection();
          await TokensFullView.waitForVisible();

          for (const { symbol } of SPAM_ASSETS) {
            await NetworkManager.checkTokenDoesNotExist(symbol, {
              timeout: CLEANUP_TIMEOUT_MS,
            });
          }

          // The widely-listed token and the hand-imported one must survive, so
          // that an empty list cannot make the assertions above pass.
          await NetworkManager.checkTokenExists(LEGITIMATE_ASSET.symbol);
          await NetworkManager.checkTokenExists(CUSTOM_ASSET.symbol);
        },
      );
    },
  );
});
