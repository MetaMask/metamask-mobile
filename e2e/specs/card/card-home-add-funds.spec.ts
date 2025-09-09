import WalletView from '../../pages/wallet/WalletView';
import { SmokeCard } from '../../tags';
import Assertions from '../../framework/Assertions';
import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { testSpecificMock } from '../../api-mocking/mock-responses/cardholder-mocks';
import { EventPayload, getEventsPayloads } from '../analytics/helpers';
import CardHomeView from '../../pages/Card/CardHomeView';
import SoftAssert from '../../utils/SoftAssert';
import { CustomNetworks } from '../../resources/networks.e2e';

describe(SmokeCard('CardHome - Add Funds'), () => {
  const eventsToCheck: EventPayload[] = [];

  const setupCardTest = async (testFunction: () => Promise<void>) => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withMetaMetricsOptIn()
          .withNetworkController(CustomNetworks.Tenderly.Linea)
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
        CardHomeView.addFundsBottomSheet,
      );
      await Assertions.expectElementToBeVisible(
        CardHomeView.addFundsBottomSheetDepositOption,
      );
      await Assertions.expectElementToBeVisible(
        CardHomeView.addFundsBottomSheetSwapOption,
      );
    });
  });

  it('should validate segment/metametric event when opening Card Home', async () => {
    const expectedEvents = {
      CARD_VIEWED: 'Card Viewed',
      CARD_HOME_CLICKED: 'Card Home Clicked',
      CARD_ADD_FUNDS_CLICKED: 'Card Add Funds Clicked',
      CARD_ADVANCED_MANAGEMENT_CLICKED: 'Card Advanced Management Clicked',
    };

    const softAssert = new SoftAssert();

    // Find all events
    const cardViewed = eventsToCheck.filter(
      (event) => event.event === expectedEvents.CARD_VIEWED,
    );
    const cardHomeClicked = eventsToCheck.filter(
      (event) => event.event === expectedEvents.CARD_HOME_CLICKED,
    );
    const cardAddFundsClicked = eventsToCheck.filter(
      (event) => event.event === expectedEvents.CARD_ADD_FUNDS_CLICKED,
    );
    const cardAdvancedManagementClicked = eventsToCheck.filter(
      (event) =>
        event.event === expectedEvents.CARD_ADVANCED_MANAGEMENT_CLICKED,
    );

    const checkCardViewed = softAssert.checkAndCollect(async () => {
      await Assertions.checkIfValueIsDefined(cardViewed);
    }, 'Check Card Viewed event');

    const checkCardHomeClicked = softAssert.checkAndCollect(async () => {
      await Assertions.checkIfValueIsDefined(cardHomeClicked);
    }, 'Check Card Home Clicked event');

    const checkCardAddFundsClicked = softAssert.checkAndCollect(async () => {
      await Assertions.checkIfValueIsDefined(cardAddFundsClicked);
    }, 'Check Card Add Funds Clicked event');

    const checkCardAdvancedManagementClicked = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(cardAdvancedManagementClicked);
      },
      'Check Card Advanced Management Clicked event',
    );

    await Promise.all([
      checkCardViewed,
      checkCardHomeClicked,
      checkCardAddFundsClicked,
      checkCardAdvancedManagementClicked,
    ]);
    softAssert.throwIfErrors();
  });
});
