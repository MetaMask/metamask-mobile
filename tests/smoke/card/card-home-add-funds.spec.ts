import WalletView from '../../page-objects/wallet/WalletView';
import { SmokeCard } from '../../tags';
import Assertions from '../../framework/Assertions';
import { loginToApp } from '../../flows/wallet.flow';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { testSpecificMock } from '../../api-mocking/mock-responses/cardholder-mocks';
import {
  EventPayload,
  getEventsPayloads,
} from '../../helpers/analytics/helpers';
import CardHomeView from '../../page-objects/Card/CardHomeView';
import SoftAssert from '../../framework/SoftAssert';
import { CustomNetworks } from '../../resources/networks.e2e';

describe(SmokeCard('CardHome - Add Funds'), () => {
  const eventsToCheck: EventPayload[] = [];

  const setupCardTest = async (testFunction: () => Promise<void>) => {
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
          .build(),
        restartDevice: true,
        testSpecificMock,
        endTestfn: async ({ mockServer }) => {
          const events = await getEventsPayloads(mockServer);
          eventsToCheck.push(...events);
        },
      },
      async () => {
        await loginToApp();
        await testFunction();
      },
    );
  };

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should open Card Home and add funds successfully', async () => {
    await setupCardTest(async () => {
      await Assertions.expectElementToBeVisible(WalletView.navbarCardButton);
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
    });
  });

  it('should validate segment/metametric event when opening Card Home', async () => {
    const expectedEvents = {
      CARD_BUTTON_VIEWED: 'Card Button Viewed',
      CARD_HOME_CLICKED: 'Card Home Clicked',
      CARD_ADD_FUNDS_CLICKED: 'Card Add Funds Clicked',
    };

    const softAssert = new SoftAssert();

    // Find all events
    const cardButtonViewed = eventsToCheck.filter(
      (event) => event.event === expectedEvents.CARD_BUTTON_VIEWED,
    );
    const cardHomeClicked = eventsToCheck.filter(
      (event) => event.event === expectedEvents.CARD_HOME_CLICKED,
    );
    const cardAddFundsClicked = eventsToCheck.filter(
      (event) => event.event === expectedEvents.CARD_ADD_FUNDS_CLICKED,
    );

    const checkCardButtonViewed = softAssert.checkAndCollect(async () => {
      await Assertions.checkIfArrayHasLength(cardButtonViewed, 1);
    }, 'Check Card Button Viewed event');

    const checkCardHomeClicked = softAssert.checkAndCollect(async () => {
      await Assertions.checkIfArrayHasLength(cardHomeClicked, 1);
    }, 'Check Card Home Clicked event');

    const checkCardAddFundsClicked = softAssert.checkAndCollect(async () => {
      await Assertions.checkIfArrayHasLength(cardAddFundsClicked, 1);
    }, 'Check Card Add Funds Clicked event');

    await Promise.all([
      checkCardButtonViewed,
      checkCardHomeClicked,
      checkCardAddFundsClicked,
    ]);
    softAssert.throwIfErrors();
  });
});
