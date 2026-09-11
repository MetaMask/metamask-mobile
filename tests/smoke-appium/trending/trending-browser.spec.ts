import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import {
  navigateToBrowserView,
  waitForTestDappToLoad,
} from '../../flows/browser.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { getDappUrlForFixture } from '../../framework/fixtures/FixtureUtils.js';
import { DappVariants } from '../../framework/Constants.js';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { TRENDING_API_MOCKS } from '../../api-mocking/mock-responses/trending-api-mocks.js';
import { setupMockEvents } from '../../api-mocking/helpers/mockHelpers.js';
import { remoteFeatureFlagTrendingTokensEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks.js';

appiumTest.describe(
  SmokeWalletPlatform('Trending Feature Browser Test'),
  () => {
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
            fixture: (() => {
              const built = new FixtureBuilder()
                .withPermissionControllerConnectedToTestDapp()
                .build();
              built.state.browser.tabs[0].url = getDappUrlForFixture(0);
              return built;
            })(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await navigateToBrowserView();

            await waitForTestDappToLoad();
          },
        );
      },
    );
  },
);
