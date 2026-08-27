import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import { SmokeMoney } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { testSpecificMock } from '../../api-mocking/mock-responses/cardholder-mocks.js';
import CardHomeView from '../../page-objects/Card/CardHomeView.js';
import { CustomNetworks } from '../../resources/networks.e2e.js';
import { cardHomeAddFundsExpectations } from '../../helpers/analytics/expectations/card-home-add-funds.analytics.js';

appiumTest.describe(SmokeMoney('CardHome - Add Funds'), () => {
  appiumTest.describe.configure({ timeout: 150000 });

  appiumTest(
    'opens Card Home and adds funds successfully',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withMetaMetricsOptIn()
            .withNetworkController(CustomNetworks.Tenderly.Linea.providerConfig)
            .withAccountTreeController()
            .withTokens(
              [
                {
                  address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
                  decimals: 18,
                  symbol: 'USDC',
                  chainId: '0xe708',
                  name: 'USDCoin',
                },
              ],
              '0xe708',
            )
            .withCardController()
            .build(),
          restartDevice: true,
          testSpecificMock,
          analyticsExpectations: cardHomeAddFundsExpectations,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await Assertions.expectElementToBeVisible(
            WalletView.navbarCardButton,
          );
          await WalletView.tapNavbarCardButton();
          await Assertions.expectElementToBeVisible(CardHomeView.cardViewTitle);
          await CardHomeView.tapAddFundsButton();
          await Assertions.expectElementToBeVisible(
            CardHomeView.addFundsBottomSheetDepositOption,
            {
              elemDescription:
                'Add Funds Bottom Sheet Deposit Option in Card Home View',
            },
          );
          await Assertions.expectElementToBeVisible(
            CardHomeView.addFundsBottomSheetSwapOption,
            {
              elemDescription:
                'Add Funds Bottom Sheet Swap Option in Card Home View',
            },
          );
        },
      );
    },
  );
});
