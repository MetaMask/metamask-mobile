import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import TrendingView from '../../page-objects/Trending/TrendingView.js';
import { TrendingViewSelectorsText } from '../../locators/Trending/TrendingView.selectors.js';
import { trendingFeedMock } from './trending-feed.mock.js';

const SECTION = TrendingViewSelectorsText.SECTION_TOKENS;
const USDC_ASSET_ID =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

appiumTest.describe(SmokeWalletPlatform('Trending Feed - Tokens'), () => {
  appiumTest(
    'Tokens: view all and item details',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withDetectedGeolocation('AR').build(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: trendingFeedMock,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await TrendingView.tapTrendingTab();
          await TrendingView.navigateToSectionTab(SECTION);
          await TrendingView.verifySectionHeaderInFeed(SECTION);

          await TrendingView.tapViewAll(SECTION);
          await TrendingView.verifySectionHeaderInFullView(SECTION);
          await TrendingView.tapBackFromFullView(SECTION);
          await TrendingView.verifyFeedVisible();

          await TrendingView.navigateToSectionTab(SECTION);
          await TrendingView.verifyTokenVisible(USDC_ASSET_ID);

          await TrendingView.tapTokenRow(USDC_ASSET_ID);
          await TrendingView.verifyTokenDetailsTitleVisible('USDC');
          await TrendingView.tapBackFromTokenDetails();
          await TrendingView.verifyFeedVisible();
        },
      );
    },
  );
});
