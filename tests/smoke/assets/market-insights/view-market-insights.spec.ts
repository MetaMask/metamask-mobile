import { SmokeNetworkAbstractions } from '../../../tags';
import WalletView from '../../../page-objects/wallet/WalletView';
import TokenOverview from '../../../page-objects/wallet/TokenOverview';
import MarketInsightsEntryCard from '../../../page-objects/wallet/MarketInsightsEntryCard';
import MarketInsightsView from '../../../page-objects/wallet/MarketInsightsView';
import QuoteView from '../../../page-objects/swaps/QuoteView';
import Assertions from '../../../framework/Assertions';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../../flows/wallet.flow';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureFlagMarketInsightsEnabled } from '../../../api-mocking/mock-responses/feature-flags-mocks';
import { marketInsightsWithData } from '../../../api-mocking/mock-responses/market-insights-api-mocks';

describe(
  SmokeNetworkAbstractions('View Market Insights on Asset Details'),
  () => {
    it('displays market insights entry card on Ethereum asset details page', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(mockServer, {
              ...remoteFeatureFlagMarketInsightsEnabled(),
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
          languageAndLocale: {
            language: 'en',
            locale: 'en_US',
          },
        },
        async () => {
          await loginToApp();

          await WalletView.tapOnToken('Ethereum');

          await Assertions.expectElementToBeVisible(TokenOverview.container, {
            description:
              'Asset details screen is visible after tapping Ethereum',
          });

          await MarketInsightsEntryCard.expectEntryCardVisible();

          await MarketInsightsEntryCard.tapEntryCard();

          await MarketInsightsView.expectViewVisible();

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
  },
);
