import WalletView from '../../page-objects/wallet/WalletView';
import { SmokeCard } from '../../tags';
import Assertions from '../../framework/Assertions';
import { loginToApp } from '../../flows/wallet.flow';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { testSpecificMock } from '../../api-mocking/mock-responses/cardholder-mocks';
import CardHomeView from '../../page-objects/Card/CardHomeView';
import { CustomNetworks } from '../../resources/networks.e2e';
import { cardButtonExpectations } from '../../helpers/analytics/expectations/card-button.analytics';

describe(SmokeCard('Card NavBar Button'), () => {
  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('opens Card Home when pressing card navbar button', async () => {
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
        analyticsExpectations: cardButtonExpectations,
      },
      async () => {
        await loginToApp();
        await Assertions.expectElementToBeVisible(WalletView.navbarCardButton);
        await WalletView.tapNavbarCardButton();
        await Assertions.expectElementToBeVisible(CardHomeView.cardViewTitle);
      },
    );
  });
});
