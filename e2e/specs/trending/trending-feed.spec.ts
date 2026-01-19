import { SmokeWalletPlatform } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { Mockttp } from 'mockttp';
import TrendingView from '../../pages/Trending/TrendingView';
import { TrendingViewSelectorsText } from '../../selectors/Trending/TrendingView.selectors';
import { TRENDING_API_MOCKS } from '../../api-mocking/mock-responses/trending-api-mocks';
import { setupMockEvents } from '../../api-mocking/helpers/mockHelpers';
import {
  remoteFeatureFlagTrendingTokensEnabled,
  remoteFeatureFlagPredictEnabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks';

describe(SmokeWalletPlatform('Trending Feed View All Navigation'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    // Enable the trending feature flag and predict trading (needed for Predictions section)
    await setupRemoteFeatureFlagsMock(mockServer, {
      ...remoteFeatureFlagTrendingTokensEnabled(),
      ...remoteFeatureFlagPredictEnabled(),
    });

    // Setup API mocks using centralized definition
    await setupMockEvents(mockServer, TRENDING_API_MOCKS);
  };

  it('Navigate to all sections full views via View All and return to feed', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        // Navigate to Trending Tab
        await TrendingView.tapTrendingTab();

        // First, test QuickAction buttons (buttons below search bar)
        const quickActionSections = [
          TrendingViewSelectorsText.SECTION_PREDICTIONS,
          TrendingViewSelectorsText.SECTION_TOKENS,
          TrendingViewSelectorsText.SECTION_PERPS,
          TrendingViewSelectorsText.SECTION_SITES,
        ];

        for (const section of quickActionSections) {
          // Verify feed is visible
          await TrendingView.verifyFeedVisible();

          // Tap QuickAction button for the section
          await TrendingView.tapQuickAction(section);

          // Verify we are in full view (Header matches section title)
          await TrendingView.verifySectionHeaderInFullView(section);

          // Go back to main feed
          await TrendingView.tapBackFromFullView(section);

          // Verify Feed is visible again before proceeding
          await TrendingView.verifyFeedVisible();
        }

        // Define the sections to visit in order with their test data
        const sectionsConfig = [
          {
            section: TrendingViewSelectorsText.SECTION_PREDICTIONS,
            itemId: '1',
            itemTitle: 'Will Bitcoin hit $100k?',
            verifyItemVisible: () => TrendingView.verifyPredictionVisible('1'),
            tapItem: () => TrendingView.tapPredictionRow('1'),
            verifyDetailsVisible: () =>
              TrendingView.verifyPredictionDetailsVisible(),
            tapBack: () => TrendingView.tapBackFromPredictionDetails(),
          },
          {
            section: TrendingViewSelectorsText.SECTION_TOKENS,
            itemId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            itemTitle: 'USD Coin',
            verifyItemVisible: () =>
              TrendingView.verifyTokenVisible(
                'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              ),
            tapItem: () =>
              TrendingView.tapTokenRow(
                'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              ),
            verifyDetailsVisible: () =>
              TrendingView.verifyTokenDetailsTitleVisible('USD Coin'),
            tapBack: () => TrendingView.tapBackFromTokenDetails(),
          },
          {
            section: TrendingViewSelectorsText.SECTION_PERPS,
            itemId: 'BTC',
            itemTitle: 'BTC',
            verifyItemVisible: () => TrendingView.verifyPerpVisible('BTC'),
            tapItem: () => TrendingView.tapPerpRow('BTC'),
            verifyDetailsVisible: () => TrendingView.verifyPerpDetailsVisible(),
            tapBack: () => TrendingView.tapBackFromPerpDetails(),
          },
          {
            section: TrendingViewSelectorsText.SECTION_SITES,
            itemId: 'Uniswap',
            itemTitle: 'Uniswap',
            verifyItemVisible: () => TrendingView.verifySiteVisible('Uniswap'),
            tapItem: () => TrendingView.tapSiteRow('Uniswap'),
            verifyDetailsVisible: () =>
              TrendingView.verifyBrowserUrlVisible('uniswap.org'),
            tapBack: () => TrendingView.tapBackFromBrowser(),
          },
        ];

        for (const config of sectionsConfig) {
          // Verify Section Header is visible in feed
          await TrendingView.verifySectionHeaderInFeed(config.section);

          // Tap View All for the section
          await TrendingView.tapViewAll(config.section);

          // Verify we are in full view (Header matches section title)
          await TrendingView.verifySectionHeaderInFullView(config.section);

          // Go back to main feed
          await TrendingView.tapBackFromFullView(config.section);

          // Verify Feed is visible again before proceeding
          await TrendingView.verifyFeedVisible();

          // Now test individual item navigation
          // Verify the item is visible in the feed
          await config.verifyItemVisible();

          // Tap on the item to open details
          await config.tapItem();

          // Verify we are on the details page
          await config.verifyDetailsVisible();

          // Go back to feed
          await config.tapBack();

          // Verify Feed is visible again before proceeding to next section
          await TrendingView.verifyFeedVisible();
        }
      },
    );
  });
});
