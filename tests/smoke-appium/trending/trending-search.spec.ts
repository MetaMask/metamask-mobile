import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { Mockttp } from 'mockttp';
import Assertions from '../../framework/Assertions.js';
import TrendingView from '../../page-objects/Trending/TrendingView.js';
import { TRENDING_API_MOCKS } from '../../api-mocking/mock-responses/trending-api-mocks.js';
import { setupMockEvents } from '../../api-mocking/helpers/mockHelpers.js';
import { remoteFeatureFlagTrendingTokensEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';

appiumTest.describe(SmokeWalletPlatform('Trending Search Smoke Test'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    await setupRemoteFeatureFlagsMock(
      mockServer,
      remoteFeatureFlagTrendingTokensEnabled(),
    );

    await setupMockEvents(mockServer, TRENDING_API_MOCKS);
  };

  appiumTest(
    'interact with search bar and verify search UI elements',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await TabBarComponent.tapExploreButton();

          await Assertions.expectElementToBeVisible(TrendingView.searchButton, {
            description: 'Search button should be visible',
          });

          await Assertions.expectElementToBeVisible(
            TrendingView.browserButton,
            {
              description: 'Browser button should be visible',
            },
          );

          await TrendingView.tapSearchButton();

          await Assertions.expectElementToBeVisible(
            TrendingView.searchCancelButton,
            {
              description:
                'Search cancel button should be visible (search mode active)',
            },
          );

          await TrendingView.typeSearchQuery('test');

          await TrendingView.verifySearchPillsVisible();

          await TrendingView.verifySearchResultsListVisible();

          await Assertions.expectElementToBeVisible(
            TrendingView.searchCancelButton,
            {
              description: 'Cancel button should be visible',
            },
          );

          await TrendingView.tapSearchCancelButton();

          await Assertions.expectElementToBeVisible(TrendingView.searchButton, {
            description: 'Search button should be visible again',
          });
        },
      );
    },
  );
});
