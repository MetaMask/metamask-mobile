import { SmokeNetworkAbstractions } from '../../../../e2e/tags';
import WalletView from '../../../../e2e/pages/wallet/WalletView';
import Assertions from '../../../framework/Assertions';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../../../e2e/viewHelper';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers';
import { defiPositionsWithData } from '../../../api-mocking/mock-responses/defi-api-mocks';

describe(SmokeNetworkAbstractions('View DeFi details'), () => {
  it('open the Aave V3 position details', async () => {
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
        await WalletView.tapOnDeFiPosition('Aave V3');

        await Assertions.expectElementToBeVisible(
          WalletView.defiPositionDetailsContainer,
        );
        await Assertions.expectTextDisplayed('Aave V3');
        await Assertions.expectTextDisplayed('$14.74');
        await Assertions.expectTextDisplayed('USDT');
        await Assertions.expectTextDisplayed('$0.30');
        await Assertions.expectTextDisplayed('0.30011 USDT');
        await Assertions.expectTextDisplayed('WETH');
        await Assertions.expectTextDisplayed('$14.44');
        await Assertions.expectTextDisplayed('0.00903 WETH');
      },
    );
  });
});
