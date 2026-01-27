import { RegressionNetworkAbstractions } from '../../../../e2e/tags';
import WalletView from '../../../../e2e/pages/wallet/WalletView';
import Assertions from '../../../framework/Assertions';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { WalletViewSelectorsText } from '../../../../app/components/Views/Wallet/WalletView.testIds';
import { loginToApp } from '../../../../e2e/viewHelper';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers';
import { Mockttp } from 'mockttp';
import {
  defiPositionsError,
  defiPositionsWithData,
  defiPositionsWithNoData,
} from '../../../api-mocking/mock-responses/defi-api-mocks.ts';
import NetworkManager from '../../../../e2e/pages/wallet/NetworkManager.ts';

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
          WalletViewSelectorsText.DEFI_EMPTY_STATE_DESCRIPTION,
        );
        await Assertions.expectTextDisplayed(
          WalletViewSelectorsText.DEFI_EMPTY_STATE_EXPLORE_BUTTON,
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

        await WalletView.tapOnDeFiNetworksFilter();
        await NetworkManager.tapNetwork('eip155:1');
        await NetworkManager.closeNetworkManager();

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
        await NetworkManager.tapSelectAllPopularNetworks();
        await NetworkManager.closeNetworkManager();

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
