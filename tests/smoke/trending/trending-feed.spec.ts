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
import { getDecodedProxiedURL } from '../notifications/utils/helpers';
import {
  remoteFeatureFlagTrendingTokensEnabled,
  remoteFeatureFlagPredictEnabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks';

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

describe(SmokeWalletPlatform('Trending Feed View All Navigation'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    // Enable the trending feature flag and predict trading (needed for Predictions section)
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

    // Setup API mocks using centralized definition
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
                TrendingView.verifyTokenDetailsTitleVisible('USD Coin'),
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
                TrendingView.verifyTokenDetailsTitleVisible(
                  'Ondo US Dollar Yield',
                ),
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
  });
});
