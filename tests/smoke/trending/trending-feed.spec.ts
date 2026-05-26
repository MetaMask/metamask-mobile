import { SmokeWalletPlatform } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { Mockttp } from 'mockttp';
import TrendingView from '../../page-objects/Trending/TrendingView';
import { TrendingViewSelectorsText } from '../../locators/Trending/TrendingView.selectors';
import {
  TRENDING_API_MOCKS,
  RWA_STOCK_ASSET_ID,
} from '../../api-mocking/mock-responses/trending-api-mocks';
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
        fixture: new FixtureBuilder().withDetectedGeolocation('AR').build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        // Navigate to Trending Tab
        await TrendingView.tapTrendingTab();

        // Sections to test, each specifying which V2 tab they live in and what
        // header text is visible in the feed (may differ from the section key).
        const sectionsConfig = [
          {
            section: TrendingViewSelectorsText.SECTION_PREDICTIONS,
            // NowTab renders "Predictions" header (wallet.predict)
            sectionHeaderText: TrendingViewSelectorsText.SECTION_PREDICTIONS,
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
            // CryptoTab renders "Trending" header (trending.trending_tokens)
            sectionHeaderText: TrendingViewSelectorsText.SECTION_TOKENS,
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
            // NowTab renders "Perps movers" header, not "Perps"
            sectionHeaderText: 'Perps movers',
            itemId: 'BTC',
            itemTitle: 'BTC',
            verifyItemVisible: () => TrendingView.verifyPerpVisible('BTC'),
            tapItem: () => TrendingView.tapPerpRow('BTC'),
            verifyDetailsVisible: () => TrendingView.verifyPerpDetailsVisible(),
            tapBack: () => TrendingView.tapBackFromPerpDetails(),
          },
          {
            section: TrendingViewSelectorsText.SECTION_STOCKS,
            // NowTab renders "Stocks" header
            sectionHeaderText: TrendingViewSelectorsText.SECTION_STOCKS,
            itemId: RWA_STOCK_ASSET_ID,
            itemTitle: 'Ondo US Dollar Yield (Ondo Tokenized)',
            verifyItemVisible: () =>
              TrendingView.verifyTokenVisible(RWA_STOCK_ASSET_ID),
            tapItem: () => TrendingView.tapTokenRow(RWA_STOCK_ASSET_ID),
            verifyDetailsVisible: () =>
              TrendingView.verifyTokenDetailsTitleVisible(
                'Ondo US Dollar Yield (Ondo Tokenized)',
              ),
            tapBack: () => TrendingView.tapBackFromTokenDetails(),
          },
          {
            section: TrendingViewSelectorsText.SECTION_SITES,
            // DappsTab renders "Popular" as the sites section header
            sectionHeaderText: 'Popular',
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
          // Navigate to the tab that contains this section (V2 tabbed layout)
          await TrendingView.navigateToSectionTab(config.section);

          // Verify Section Header is visible in feed using the actual header text
          await TrendingView.verifySectionHeaderInFeed(
            config.sectionHeaderText,
          );

          // Tap View All for the section
          await TrendingView.tapViewAll(config.section);

          // Verify we are in full view (Header matches section title)
          await TrendingView.verifySectionHeaderInFullView(config.section);

          // Go back to main feed
          await TrendingView.tapBackFromFullView(config.section);

          // Verify Feed is visible again before proceeding
          await TrendingView.verifyFeedVisible();

          // Navigate to the correct tab for item-level navigation
          await TrendingView.navigateToSectionTab(config.section);

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
