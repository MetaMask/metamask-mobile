import { SmokeNetworkAbstractions } from '../../../tags';
import WalletView from '../../../page-objects/wallet/WalletView';
import TokenOverview from '../../../page-objects/wallet/TokenOverview';
import MarketInsightsEntryCard from '../../../page-objects/wallet/MarketInsightsEntryCard';
import MarketInsightsView from '../../../page-objects/wallet/MarketInsightsView';
import QuoteView from '../../../page-objects/swaps/QuoteView';
import BuildQuoteView from '../../../page-objects/Ramps/BuildQuoteView';
import Assertions from '../../../framework/Assertions';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../../flows/wallet.flow';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  remoteFeatureFlagMarketInsightsEnabled,
  remoteFeatureFlagRampsUnifiedV2Enabled,
} from '../../../api-mocking/mock-responses/feature-flags-mocks';
import {
  marketInsightsWithData,
  marketInsightsNoData,
} from '../../../api-mocking/mock-responses/market-insights-api-mocks';

const TOKEN = 'Ethereum';

const mockWithDataAndRamps = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagMarketInsightsEnabled(),
    ...remoteFeatureFlagRampsUnifiedV2Enabled(true),
  });
  const { urlEndpoint, response, responseCode } = marketInsightsWithData;
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: urlEndpoint,
    response,
    responseCode,
  });
};

const mockWithData = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagMarketInsightsEnabled(),
  });
  const { urlEndpoint, response, responseCode } = marketInsightsWithData;
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: urlEndpoint,
    response,
    responseCode,
  });
};

const navigateToMarketInsightsView = async () => {
  await loginToApp();
  await WalletView.waitForTokenToBeReady(TOKEN);
  await WalletView.tapOnToken(TOKEN);
  await Assertions.expectElementToBeVisible(TokenOverview.container, {
    description: 'Asset details screen is visible after tapping Ethereum',
  });
  await MarketInsightsEntryCard.expectEntryCardVisible();
  await MarketInsightsEntryCard.tapEntryCard();
  await MarketInsightsView.expectViewVisible();
};

describe(
  SmokeNetworkAbstractions('View Market Insights on Asset Details'),
  () => {
    it('displays market insights content and navigates to swap', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          testSpecificMock: mockWithData,
          languageAndLocale: { language: 'en', locale: 'en_US' },
        },
        async () => {
          await navigateToMarketInsightsView();

          await Assertions.expectTextDisplayed(
            'Ethereum shows strong momentum amid institutional demand',
            { description: 'Market Insights headline is displayed' },
          );

          await Assertions.expectTextDisplayed(
            'Ethereum continues to attract institutional interest with increasing on-chain activity and a healthy DeFi ecosystem.',
            { description: 'Market Insights summary is displayed' },
          );

          await Assertions.expectTextDisplayed('Institutional Adoption', {
            description: 'Market Insights first trend title is displayed',
          });

          await Assertions.expectTextDisplayed('DeFi Activity Surge', {
            description: 'Market Insights second trend title is displayed',
          });

          await MarketInsightsView.expectSwapButtonVisible();
          await MarketInsightsView.expectBuyButtonVisible();

          await MarketInsightsView.tapSwapButton();
          await QuoteView.isVisible();
        },
      );
    });

    it('does not display entry card when API returns no data', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(mockServer, {
              ...remoteFeatureFlagMarketInsightsEnabled(),
            });
            const { urlEndpoint, response, responseCode } =
              marketInsightsNoData;
            await setupMockRequest(mockServer, {
              requestMethod: 'GET',
              url: urlEndpoint,
              response,
              responseCode,
            });
          },
          languageAndLocale: { language: 'en', locale: 'en_US' },
        },
        async () => {
          await loginToApp();
          await WalletView.waitForTokenToBeReady(TOKEN);
          await WalletView.tapOnToken(TOKEN);
          await Assertions.expectElementToBeVisible(TokenOverview.container, {
            description:
              'Asset details screen is visible after tapping Ethereum',
          });
          await MarketInsightsEntryCard.expectEntryCardNotVisible();
        },
      );
    });

    it('does not display entry card when feature flag is disabled', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(mockServer, {
              ...remoteFeatureFlagMarketInsightsEnabled(false),
            });
            const { urlEndpoint, response, responseCode } =
              marketInsightsWithData;
            await setupMockRequest(mockServer, {
              requestMethod: 'GET',
              url: urlEndpoint,
              response,
              responseCode,
            });
          },
          languageAndLocale: { language: 'en', locale: 'en_US' },
        },
        async () => {
          await loginToApp();
          await WalletView.waitForTokenToBeReady(TOKEN);
          await WalletView.tapOnToken(TOKEN);
          await Assertions.expectElementToBeVisible(TokenOverview.container, {
            description:
              'Asset details screen is visible after tapping Ethereum',
          });
          await MarketInsightsEntryCard.expectEntryCardNotVisible();
        },
      );
    });

    it('navigates to buy screen when tapping Buy button', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          testSpecificMock: mockWithDataAndRamps,
          languageAndLocale: { language: 'en', locale: 'en_US' },
        },
        async () => {
          await navigateToMarketInsightsView();
          await MarketInsightsView.tapBuyButton();
          await Assertions.expectElementToBeVisible(
            BuildQuoteView.continueButton,
            {
              description:
                'Buy/Ramp BuildQuote screen is visible after tapping Buy',
            },
          );
        },
      );
    });

    it('shows sources bottom sheet when tapping a trend item', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          testSpecificMock: mockWithData,
          languageAndLocale: { language: 'en', locale: 'en_US' },
        },
        async () => {
          await navigateToMarketInsightsView();
          await MarketInsightsView.tapTrendItem(0);
          await Assertions.expectTextDisplayed(
            'Spot Ethereum ETFs See Record Weekly Inflows',
            { description: 'Trend sources bottom sheet shows article title' },
          );
        },
      );
    });

    it('can tap thumbs up feedback button', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          testSpecificMock: mockWithData,
          languageAndLocale: { language: 'en', locale: 'en_US' },
        },
        async () => {
          await navigateToMarketInsightsView();
          await MarketInsightsView.scrollToThumbsUp();
          await MarketInsightsView.tapThumbsUpButton();
          await MarketInsightsView.expectThumbsUpFilled();
        },
      );
    });

    it('can tap thumbs down feedback button', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          testSpecificMock: mockWithData,
          languageAndLocale: { language: 'en', locale: 'en_US' },
        },
        async () => {
          await navigateToMarketInsightsView();
          await MarketInsightsView.scrollToThumbsUp();
          await MarketInsightsView.tapThumbsDownButton();
          await MarketInsightsView.expectFeedbackBottomSheetVisible();
        },
      );
    });
  },
);
