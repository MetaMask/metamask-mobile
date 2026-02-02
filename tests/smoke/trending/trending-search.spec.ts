import { SmokeWalletPlatform } from '../../../e2e/tags';
import { loginToApp } from '../../../e2e/viewHelper.ts';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.ts';
import { Mockttp } from 'mockttp';
import { Assertions } from '../../framework';
import TrendingView from '../../page-objects/Trending/TrendingView.ts';
import { TRENDING_API_MOCKS } from '../../api-mocking/mock-responses/trending-api-mocks.ts';
import { setupMockEvents } from '../../api-mocking/helpers/mockHelpers.ts';
import { remoteFeatureFlagTrendingTokensEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks.ts';
import TabBarComponent from '../../../e2e/pages/wallet/TabBarComponent.ts';

describe(SmokeWalletPlatform('Trending Search Smoke Test'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    // Enable the trending feature flag
    await setupRemoteFeatureFlagsMock(
      mockServer,
      remoteFeatureFlagTrendingTokensEnabled(),
    );

    // Setup API mocks using centralized definition
    await setupMockEvents(mockServer, TRENDING_API_MOCKS);
  };

  it('interact with search bar and verify search UI elements', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        // 1. Navigate to Trending Tab
        await TabBarComponent.tapExploreButton();

        // 2. Verify Search Bar Visibility
        await Assertions.expectElementToBeVisible(TrendingView.searchButton, {
          description: 'Search button should be visible',
        });

        // 3. Verify Browser Tabs Count (optional, checking element existence)
        await Assertions.expectElementToBeVisible(TrendingView.browserButton, {
          description: 'Browser button should be visible',
        });

        // 4. Tap Search Button to enter interactive mode
        await TrendingView.tapSearchButton();

        // 5. Verify Search Input is visible and focused
        await Assertions.expectElementToBeVisible(TrendingView.searchInput, {
          description: 'Search input should be visible',
        });

        // 6. Type a query
        await TrendingView.typeSearchQuery('test');

        // 6.5. Scroll down to ensure Google Search Option is visible
        await TrendingView.scrollToGoogleSearchOption();

        // 7. Verify Google Search Option is visible
        await TrendingView.verifyGoogleSearchOptionVisible();

        // 8. Verify Cancel button is visible
        await Assertions.expectElementToBeVisible(
          TrendingView.searchCancelButton,
          {
            description: 'Cancel button should be visible',
          },
        );

        // 9. Tap Cancel to exit search
        await TrendingView.tapSearchCancelButton();

        // 10. Verify we are back to main feed (Search button visible again)
        await Assertions.expectElementToBeVisible(TrendingView.searchButton, {
          description: 'Search button should be visible again',
        });
      },
    );
  });
});
