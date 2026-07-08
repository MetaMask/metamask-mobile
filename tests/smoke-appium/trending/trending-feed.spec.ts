import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { Mockttp } from 'mockttp';
import TrendingView from '../../page-objects/Trending/TrendingView.js';
import { TrendingViewSelectorsText } from '../../locators/Trending/TrendingView.selectors.js';
import {
  TRENDING_API_MOCKS,
  RWA_STOCK_ASSET_ID,
} from '../../api-mocking/mock-responses/trending-api-mocks.js';
import { setupMockEvents } from '../../api-mocking/helpers/mockHelpers.js';
import { getDecodedProxiedURL } from '../../smoke/notifications/utils/helpers.js';
import {
  remoteFeatureFlagTrendingTokensEnabled,
  remoteFeatureFlagPredictEnabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks.js';

const USDC_ASSET_ID =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

interface SectionConfig {
  section: string;
  sectionHeaderText: string;
  verifyItemVisible: () => Promise<void>;
  details?: {
    tapItem: () => Promise<void>;
    verifyVisible: () => Promise<void>;
    tapBack: () => Promise<void>;
  };
}

appiumTest.describe(SmokeWalletPlatform('Trending Feed View All Navigation'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    await setupRemoteFeatureFlagsMock(mockServer, {
      ...remoteFeatureFlagTrendingTokensEnabled(),
      ...remoteFeatureFlagPredictEnabled(),
      // TODO: Fix this test to support the FF-enabled What's Happening Explore section.
      aiSocialWhatsHappeningEnabled: {
        enabled: false,
        minimumVersion: '0.0.0',
      },
      predictWorldCup: {
        enabled: false,
        minimumVersion: '0.0.0',
      },
    });

    await setupMockEvents(mockServer, TRENDING_API_MOCKS);

    await mockServer
      .forPost('/proxy')
      .matching((request) => {
        try {
          const url = getDecodedProxiedURL(request.url);
          return /compliance\.(dev-api|api|uat-api)\.cx\.metamask\.io\/v1\/wallet\/batch/.test(
            url,
          );
        } catch {
          return false;
        }
      })
      .asPriority(1001)
      .thenCallback(async (request) => {
        let addresses: string[] = [];
        try {
          const text = await request.body.getText();
          if (text) {
            const parsed = JSON.parse(text) as unknown;
            if (Array.isArray(parsed)) {
              addresses = parsed.filter(
                (a): a is string => typeof a === 'string',
              );
            }
          }
        } catch {
          /* ignore malformed body */
        }
        return {
          statusCode: 200,
          json: addresses.map((address) => ({ address, blocked: false })),
        };
      });
  };

  appiumTest(
    'Navigate to all sections full views via View All and return to feed',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withDetectedGeolocation('AR').build(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await TrendingView.tapTrendingTab();

          const sectionsConfig: SectionConfig[] = [
            {
              section: TrendingViewSelectorsText.SECTION_PREDICTIONS,
              sectionHeaderText: TrendingViewSelectorsText.SECTION_PREDICTIONS,
              verifyItemVisible: () => TrendingView.verifyPredictionVisible('1'),
              details: {
                tapItem: () => TrendingView.tapPredictionRow('1'),
                verifyVisible: () =>
                  TrendingView.verifyPredictionDetailsVisible(),
                tapBack: () => TrendingView.tapBackFromPredictionDetails(),
              },
            },
            {
              section: TrendingViewSelectorsText.SECTION_PERPS,
              sectionHeaderText: 'Perps movers',
              verifyItemVisible: () => TrendingView.verifyPerpVisible('BTC'),
              details: {
                tapItem: () => TrendingView.tapPerpRow('BTC'),
                verifyVisible: () => TrendingView.verifyPerpDetailsVisible(),
                tapBack: () => TrendingView.tapBackFromPerpDetails(),
              },
            },
            {
              section: TrendingViewSelectorsText.SECTION_TOKENS,
              sectionHeaderText: TrendingViewSelectorsText.SECTION_TOKENS,
              verifyItemVisible: () =>
                TrendingView.verifyTokenVisible(USDC_ASSET_ID),
              details: {
                tapItem: () => TrendingView.tapTokenRow(USDC_ASSET_ID),
                verifyVisible: () =>
                  TrendingView.verifyTokenDetailsTitleVisible('USDC'),
                tapBack: () => TrendingView.tapBackFromTokenDetails(),
              },
            },
            {
              section: TrendingViewSelectorsText.SECTION_STOCKS,
              sectionHeaderText: TrendingViewSelectorsText.SECTION_STOCKS,
              verifyItemVisible: () =>
                TrendingView.verifyTokenVisible(RWA_STOCK_ASSET_ID),
              details: {
                tapItem: () => TrendingView.tapTokenRow(RWA_STOCK_ASSET_ID),
                verifyVisible: () =>
                  TrendingView.verifyTokenDetailsTitleVisible('USDY'),
                tapBack: () => TrendingView.tapBackFromTokenDetails(),
              },
            },
            {
              section: TrendingViewSelectorsText.SECTION_SITES,
              sectionHeaderText: 'Popular',
              verifyItemVisible: () => TrendingView.verifySiteVisible('Uniswap'),
            },
          ];

          for (const config of sectionsConfig) {
            await TrendingView.navigateToSectionTab(config.section);
            await TrendingView.verifySectionHeaderInFeed(
              config.sectionHeaderText,
            );

            await TrendingView.tapViewAll(config.section);
            await TrendingView.verifySectionHeaderInFullView(config.section);
            await TrendingView.tapBackFromFullView(config.section);
            await TrendingView.verifyFeedVisible();

            await TrendingView.navigateToSectionTab(config.section);
            await config.verifyItemVisible();

            if (config.details) {
              await config.details.tapItem();
              await config.details.verifyVisible();
              await config.details.tapBack();
              await TrendingView.verifyFeedVisible();
            }
          }
        },
      );
    },
  );
});
