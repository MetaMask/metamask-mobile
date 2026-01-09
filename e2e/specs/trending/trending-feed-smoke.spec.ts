import { SmokeWalletUX } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { Mockttp } from 'mockttp';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import TrendingView from '../../pages/Trending/TrendingView';
import { TRENDING_API_MOCKS } from '../../api-mocking/mock-responses/trending-api-mocks';
import { setupMockEvents } from '../../api-mocking/helpers/mockHelpers';

describe(SmokeWalletUX('Trending Feed Smoke Test'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    // Enable the trending feature flag
    await setupRemoteFeatureFlagsMock(mockServer, {
      trendingTokens: true,
    });

    // Setup API mocks using centralized definition
    await setupMockEvents(mockServer, TRENDING_API_MOCKS);
  };

  it('verify visibility of trending sections and navigation to details', async () => {
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

        // 2. Verify visibility of sections
        // Note: We're checking text content for headers as a proxy for section visibility
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText('Tokens'),
          {
            description: 'Tokens section header should be visible',
          },
        );

        // 3. Verify Token Item is visible (USDC from mock)
        const usdcAssetId =
          'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
        await TrendingView.verifyTokenVisible(usdcAssetId);

        // 4. Navigate to Token Details
        await TrendingView.tapTokenRow(usdcAssetId);

        // 5. Verify Details Page
        // "USD Coin" should be visible as title
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText('USD Coin'),
          {
            description: 'Token details page title should be visible',
          },
        );
      },
    );
  });

  it('expand section for full screen view', async () => {
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

        // 2. Tap View All for Tokens
        await TrendingView.tapViewAll('Tokens');

        // 3. Verify Full Screen View
        // The title "Tokens" should still be visible.
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText('Tokens'),
          {
            description: 'Tokens full view title should be visible',
          },
        );
      },
    );
  });
});
