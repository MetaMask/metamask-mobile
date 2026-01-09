import { SmokeWalletPlatform } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { DappVariants } from '../../framework/Constants';
import Browser from '../../pages/Browser/BrowserView';
import TestDApp from '../../pages/Browser/TestDApp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { Mockttp } from 'mockttp';
import Assertions from '../../framework/Assertions';
import TrendingView from '../../pages/Trending/TrendingView';
import { TRENDING_API_MOCKS } from '../../api-mocking/mock-responses/trending-api-mocks';
import { setupMockEvents } from '../../api-mocking/helpers/mockHelpers';

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

        // 1. Navigate to Trending Tab
        await TrendingView.tapTrendingTab();

        // 2. Verify Browser Button Visibility
        await Assertions.expectElementToBeVisible(TrendingView.browserButton, {
          description: 'Trending view browser button should be visible',
        });

        // 3. Go to Browser
        await TrendingView.tapBrowserButton();

        // 4. Verify we are in Browser View
        await Assertions.expectElementToBeVisible(Browser.urlInputBoxID, {
          description: 'Browser URL bar should be visible',
        });

        // 5. Navigate to Test Dapp
        await Browser.navigateToTestDApp();

        // 6. Interact (verify connect button is visible to ensure page loaded)
        await Assertions.expectElementToBeVisible(TestDApp.testDappPageTitle, {
          description: 'Test Dapp page title should be visible',
        });
      },
    );
  });
});
