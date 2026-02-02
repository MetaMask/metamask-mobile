import { SmokeWalletPlatform } from '../../tags';
import { loginToApp, navigateToBrowserView } from '../../viewHelper';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { DappVariants } from '../../../tests/framework/Constants';
import { Mockttp } from 'mockttp';
import { Assertions } from '../../../tests/framework';
import { setupRemoteFeatureFlagsMock } from '../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import { TRENDING_API_MOCKS } from '../../../tests/api-mocking/mock-responses/trending-api-mocks';
import { setupMockEvents } from '../../../tests/api-mocking/helpers/mockHelpers';
import { remoteFeatureFlagTrendingTokensEnabled } from '../../../tests/api-mocking/mock-responses/feature-flags-mocks';
import Browser from '../../pages/Browser/BrowserView';
import TestDApp from '../../pages/Browser/TestDApp';

describe(SmokeWalletPlatform('Trending Feature Browser Test'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    // Enable the trending feature flag
    await setupRemoteFeatureFlagsMock(
      mockServer,
      remoteFeatureFlagTrendingTokensEnabled(),
    );

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

        // click on the first default Tab
        await Browser.tapFirstTabButton;

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
