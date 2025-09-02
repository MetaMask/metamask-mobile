import { RegressionNetworkAbstractions } from '../../../tags';
import WalletView from '../../../pages/wallet/WalletView';
import Assertions from '../../../framework/Assertions';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { WalletViewSelectorsText } from '../../../selectors/wallet/WalletView.selectors';
import { loginToApp } from '../../../viewHelper';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers';
import { Mockttp } from 'mockttp';
import {
  defiPositionsError,
  defiPositionsWithData,
  defiPositionsWithNoData,
} from '../../../api-mocking/mock-responses/defi-api-mocks';

describe(RegressionNetworkAbstractions('View DeFi tab'), () => {
  it('open the DeFi tab with an address that has no positions', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          const { urlEndpoint, response } = defiPositionsWithNoData;
          await setupMockRequest(mockServer, {
            requestMethod: 'GET',
            url: urlEndpoint,
            response,
            responseCode: 200,
          });
        },
      },
      async () => {
        await loginToApp();

        await Assertions.expectElementToBeVisible(WalletView.container);
        await Assertions.expectElementToBeVisible(WalletView.defiTab);

        await WalletView.tapOnDeFiTab();

        await Assertions.expectElementToBeVisible(WalletView.defiTabContainer);
        await Assertions.expectElementToBeVisible(WalletView.defiNetworkFilter);
        await Assertions.expectTextDisplayed(
          WalletViewSelectorsText.DEFI_NO_VISIBLE_POSITIONS,
        );
        await Assertions.expectTextDisplayed(
          WalletViewSelectorsText.DEFI_NOT_SUPPORTED,
        );
      },
    );
  });

  it('open the DeFi tab when the position fetching fails', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          const { urlEndpoint, response } = defiPositionsError;
          await setupMockRequest(mockServer, {
            requestMethod: 'GET',
            url: urlEndpoint,
            response,
            responseCode: 200,
          });
        },
      },
      async () => {
        await loginToApp();

        await Assertions.expectElementToBeVisible(WalletView.container);
        await Assertions.expectElementToBeVisible(WalletView.defiTab);

        await WalletView.tapOnDeFiTab();

        await Assertions.expectElementToNotBeVisible(
          WalletView.defiTabContainer,
        );
        await Assertions.expectElementToNotBeVisible(
          WalletView.defiNetworkFilter,
        );
        await Assertions.expectTextDisplayed(
          WalletViewSelectorsText.DEFI_ERROR_CANNOT_LOAD_PAGE,
        );
        await Assertions.expectTextDisplayed(
          WalletViewSelectorsText.DEFI_ERROR_VISIT_AGAIN,
        );
      },
    );
  });

  it('open the DeFi tab with an address that has positions', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          const { urlEndpoint, response } = defiPositionsWithData;
          await setupMockRequest(mockServer, {
            requestMethod: 'GET',
            url: urlEndpoint,
            response,
            responseCode: 200,
          });
        },
        languageAndLocale: {
          language: 'en',
          locale: 'en_US',
        },
      },
      async () => {
        await loginToApp();

        await Assertions.expectElementToBeVisible(WalletView.container);
        await Assertions.expectElementToBeVisible(WalletView.defiTab);

        await WalletView.tapOnDeFiTab();

        await Assertions.expectElementToBeVisible(WalletView.defiTabContainer);
        await Assertions.expectElementToBeVisible(WalletView.defiNetworkFilter);
        await Assertions.expectTextDisplayed('Aave V2');
        await Assertions.expectTextDisplayed('$14.74');
        await Assertions.expectTextDisplayed('Aave V3');
        await Assertions.expectTextDisplayed('$0.33');
        await Assertions.expectTextNotDisplayed('Uniswap V2');
        await Assertions.expectTextNotDisplayed('$4.24');
        await Assertions.expectTextNotDisplayed('Uniswap V3');
        await Assertions.expectTextNotDisplayed('$8.48');

        await WalletView.tapOnDeFiNetworksFilter();
        await WalletView.tapTokenNetworkFilterAll();

        await Assertions.expectTextDisplayed('Aave V2');
        await Assertions.expectTextDisplayed('$14.74');
        await Assertions.expectTextDisplayed('Aave V3');
        await Assertions.expectTextDisplayed('$0.33');
        await Assertions.expectTextDisplayed('Uniswap V2');
        await Assertions.expectTextDisplayed('$4.24');
        await Assertions.expectTextDisplayed('Uniswap V3');
        await Assertions.expectTextDisplayed('$8.48');
      },
    );
  });
});
