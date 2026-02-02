import { SmokeWalletPlatform } from '../../../e2e/tags';
import { loginToApp, navigateToBrowserView } from '../../../e2e/viewHelper.ts';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import { DappVariants } from '../../framework/Constants.ts';
import { Mockttp } from 'mockttp';
import { Assertions } from '../../framework';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.ts';
import { TRENDING_API_MOCKS } from '../../api-mocking/mock-responses/trending-api-mocks.ts';
import { setupMockEvents } from '../../api-mocking/helpers/mockHelpers.ts';
import { remoteFeatureFlagTrendingTokensEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks.ts';
import Browser from '../../../e2e/pages/Browser/BrowserView.ts';
import TestDApp from '../../../e2e/pages/Browser/TestDApp.ts';

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
