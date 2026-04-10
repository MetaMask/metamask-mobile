import { SmokeNetworkAbstractions } from '../../tags';
import WalletView from '../../page-objects/wallet/WalletView';
import PerpsMarketDetailsView from '../../page-objects/Perps/PerpsMarketDetailsView';
import PerpsMarketListView from '../../page-objects/Perps/PerpsMarketListView';
import MarketInsightsEntryCard from '../../page-objects/wallet/MarketInsightsEntryCard';
import MarketInsightsView from '../../page-objects/wallet/MarketInsightsView';
import Assertions from '../../framework/Assertions';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../flows/wallet.flow';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  remoteFeatureFlagMarketInsightsPerpsEnabled,
  remoteFeatureFlagHomepageSectionsV1Enabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks';
import { marketInsightsWithData } from '../../api-mocking/mock-responses/market-insights-api-mocks';
import { PERPS_ARBITRUM_MOCKS } from '../../api-mocking/mock-responses/perps-arbitrum-mocks';

const mockWithPerpsData = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagHomepageSectionsV1Enabled(),
    ...remoteFeatureFlagMarketInsightsPerpsEnabled(),
  });
  await PERPS_ARBITRUM_MOCKS(mockServer);
  const { urlEndpoint, response, responseCode } = marketInsightsWithData;
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: urlEndpoint,
    response,
    responseCode,
  });
};

/** Navigate to Market Insights from BTC (which has an open position in the test account). */
const navigateToPerpsMarketInsightsViewBTC = async () => {
  await loginToApp();
  await device.disableSynchronization();
  await WalletView.scrollAndTapPerpsSection();
  await PerpsMarketListView.tapMarketRowItemBTC();
  await PerpsMarketDetailsView.isContainerDisplayed();
  await PerpsMarketDetailsView.scrollToMarketInsightsCard();
  await MarketInsightsEntryCard.expectEntryCardVisible();
  await MarketInsightsEntryCard.tapEntryCard();
  await MarketInsightsView.expectViewVisible();
};

describe(
  SmokeNetworkAbstractions('View Market Insights on Perps Market Details'),
  () => {
    it('displays market insights content without Long/Short buttons when BTC position is open', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withPerpsFirstTimeUser(false).build(),
          restartDevice: true,
          testSpecificMock: mockWithPerpsData,
          languageAndLocale: { language: 'en', locale: 'en_US' },
        },
        async () => {
          await navigateToPerpsMarketInsightsViewBTC();

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

          // With an open BTC position, hasPerpsPosition=true → Long/Short buttons are hidden
          await MarketInsightsView.expectLongButtonNotVisible();
          await MarketInsightsView.expectShortButtonNotVisible();
        },
      );
    });

    it('displays Long/Short buttons when no BTC position is open', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPerpsProfile('no-positions')
            .withPerpsFirstTimeUser(false)
            .build(),
          restartDevice: true,
          testSpecificMock: mockWithPerpsData,
          languageAndLocale: { language: 'en', locale: 'en_US' },
        },
        async () => {
          await navigateToPerpsMarketInsightsViewBTC();

          await MarketInsightsView.expectLongButtonVisible();
          await MarketInsightsView.expectShortButtonVisible();
        },
      );
    });

    it('does not display entry card when perps market insights flag is disabled', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withPerpsFirstTimeUser(false).build(),
          restartDevice: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(mockServer, {
              ...remoteFeatureFlagHomepageSectionsV1Enabled(),
              ...remoteFeatureFlagMarketInsightsPerpsEnabled(false),
            });
            await PERPS_ARBITRUM_MOCKS(mockServer);
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
          await device.disableSynchronization();
          await WalletView.scrollAndTapPerpsSection();
          await PerpsMarketListView.tapMarketRowItemBTC();
          await PerpsMarketDetailsView.isContainerDisplayed();
          await PerpsMarketDetailsView.scrollToBottom();
          await MarketInsightsEntryCard.expectEntryCardNotVisible();
        },
      );
    });

    it('shows sources bottom sheet when tapping a trend item', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withPerpsFirstTimeUser(false).build(),
          restartDevice: true,
          testSpecificMock: mockWithPerpsData,
          languageAndLocale: { language: 'en', locale: 'en_US' },
        },
        async () => {
          await navigateToPerpsMarketInsightsViewBTC();
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
          fixture: new FixtureBuilder().withPerpsFirstTimeUser(false).build(),
          restartDevice: true,
          testSpecificMock: mockWithPerpsData,
          languageAndLocale: { language: 'en', locale: 'en_US' },
        },
        async () => {
          await navigateToPerpsMarketInsightsViewBTC();
          await MarketInsightsView.scrollToThumbsUp();
          await MarketInsightsView.tapThumbsUpButton();
          await MarketInsightsView.expectThumbsUpFilled();
        },
      );
    });

    it('can tap thumbs down feedback button', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withPerpsFirstTimeUser(false).build(),
          restartDevice: true,
          testSpecificMock: mockWithPerpsData,
          languageAndLocale: { language: 'en', locale: 'en_US' },
        },
        async () => {
          await navigateToPerpsMarketInsightsViewBTC();
          await MarketInsightsView.scrollToThumbsUp();
          await MarketInsightsView.tapThumbsDownButton();
          await MarketInsightsView.expectFeedbackBottomSheetVisible();
        },
      );
    });
  },
);
