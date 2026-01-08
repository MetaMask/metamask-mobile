import { SmokeWalletUX } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { Mockttp } from 'mockttp';
import Assertions from '../../framework/Assertions';
import TrendingView from '../../pages/Trending/TrendingView';
import { TRENDING_API_MOCKS } from '../../api-mocking/mock-responses/trending-api-mocks';
import { setupMockEvents } from '../../api-mocking/helpers/mockHelpers';

describe(SmokeWalletUX('Trending Search Smoke Test'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    // Enable the trending feature flag
    await setupRemoteFeatureFlagsMock(mockServer, {
      trendingTokens: true,
    });

    // Setup API mocks using centralized definition
    await setupMockEvents(mockServer, TRENDING_API_MOCKS);
  };

  it('should interact with search bar and verify search UI elements', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        // 1. Navigate to Trending Tab
        await TrendingView.tapTrendingTab();

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

        // 7. Verify Cancel button is visible
        await Assertions.expectElementToBeVisible(
          TrendingView.searchCancelButton,
          {
            description: 'Cancel button should be visible',
          },
        );

        // 8. Tap Cancel to exit search
        await TrendingView.tapSearchCancelButton();

        // 9. Verify we are back to main feed (Search button visible again)
        await Assertions.expectElementToBeVisible(TrendingView.searchButton, {
          description: 'Search button should be visible again',
        });
      },
    );
  });
});
