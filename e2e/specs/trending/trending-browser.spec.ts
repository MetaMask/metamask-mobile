import { SmokeWalletPlatform } from '../../tags';
import { loginToApp, navigateToBrowserView } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { DappVariants } from '../../framework/Constants';
import { Mockttp } from 'mockttp';
import { Assertions } from '../../framework';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { TRENDING_API_MOCKS } from '../../api-mocking/mock-responses/trending-api-mocks';
import { setupMockEvents } from '../../api-mocking/helpers/mockHelpers';
import Browser from '../../pages/Browser/BrowserView';
import TestDApp from '../../pages/Browser/TestDApp';

describe(SmokeWalletPlatform('Trending Feature Browser Test'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    // Enable the trending feature flag
    await setupRemoteFeatureFlagsMock(mockServer, {
      trendingTokens: true,
    });

    // Setup API mocks using centralized definition
    await setupMockEvents(mockServer, TRENDING_API_MOCKS);
  };

  it('navigate to browser from trending view and interact with dapp', async () => {
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
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        // Navigate to Browser View (automatically adapts to Explore/Trending or direct Browser tab)
        await navigateToBrowserView();

        // Navigate to Test Dapp
        await Browser.navigateToTestDApp();

        // Verify test dapp loaded
        await Assertions.expectElementToBeVisible(TestDApp.testDappPageTitle, {
          description: 'Test Dapp page title should be visible',
        });
      },
    );
  });
});
