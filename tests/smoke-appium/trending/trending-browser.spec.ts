import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import { navigateToBrowserView } from '../../flows/browser.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { DappVariants } from '../../framework/Constants.js';
import { Mockttp } from 'mockttp';
import Assertions from '../../framework/Assertions.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { TRENDING_API_MOCKS } from '../../api-mocking/mock-responses/trending-api-mocks.js';
import { setupMockEvents } from '../../api-mocking/helpers/mockHelpers.js';
import { remoteFeatureFlagTrendingTokensEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks.js';
import Browser from '../../page-objects/Browser/BrowserView.js';
import TestDApp from '../../page-objects/Browser/TestDApp.js';

appiumTest.describe(SmokeWalletPlatform('Trending Feature Browser Test'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    await setupRemoteFeatureFlagsMock(
      mockServer,
      remoteFeatureFlagTrendingTokensEnabled(),
    );

    await setupMockEvents(mockServer, TRENDING_API_MOCKS);
  };

  appiumTest(
    'navigate to browser from trending view and interact with dapp',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder()
            .withPermissionControllerConnectedToTestDapp()
            .build(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await navigateToBrowserView();

          await Browser.navigateToTestDApp();

          await Assertions.expectElementToBeVisible(TestDApp.testDappPageTitle, {
            description: 'Test Dapp page title should be visible',
          });
        },
      );
    },
  );
});
