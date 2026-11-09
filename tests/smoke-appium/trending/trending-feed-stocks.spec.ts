import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import TrendingView from '../../page-objects/Trending/TrendingView.js';
import { TrendingViewSelectorsText } from '../../locators/Trending/TrendingView.selectors.js';
import { RWA_STOCK_ASSET_ID } from '../../api-mocking/mock-responses/trending-api-mocks.js';
import { trendingFeedMock } from './trending-feed.mock.js';

const SECTION = TrendingViewSelectorsText.SECTION_STOCKS;

appiumTest.describe(SmokeWalletPlatform('Trending Feed - Stocks'), () => {
  appiumTest(
    'Stocks: view all and item details',
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
          await TrendingView.verifyTokenVisible(RWA_STOCK_ASSET_ID);

          await TrendingView.tapTokenRow(RWA_STOCK_ASSET_ID);
          await TrendingView.verifyTokenDetailsTitleVisible('USDY');
          await TrendingView.tapBackFromTokenDetails();
          await TrendingView.verifyFeedVisible();
        },
      );
    },
  );
});
