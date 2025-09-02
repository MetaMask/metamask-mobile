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

describe(SmokeCard('Card NavBar Button'), () => {
  const eventsToCheck: EventPayload[] = [];

  const setupCardTest = async (testFunction: () => Promise<void>) => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withMetaMetricsOptIn()
          .withNetworkController(CustomNetworks.Tenderly.Linea)
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

  it('should open Card Home when pressing card navbar button', async () => {
    await setupCardTest(async () => {
      await Assertions.expectElementToBeVisible(WalletView.navbarCardButton);
      await WalletView.tapNavbarCardButton();
      await Assertions.expectElementToBeVisible(CardHomeView.cardViewTitle);
    });
  });

  it('should validate segment/metametric event when opening Card Home', async () => {
    const expectedEvents = {
      CARD_VIEWED: 'Card Viewed',
      CARD_HOME_CLICKED: 'Card Home Clicked',
    };

    const softAssert = new SoftAssert();

    // Find all events
    const cardViewed = eventsToCheck.filter(
      (event) => event.event === expectedEvents.CARD_VIEWED,
    );
    const cardHomeClicked = eventsToCheck.filter(
      (event) => event.event === expectedEvents.CARD_HOME_CLICKED,
    );

    const checkCardViewed = softAssert.checkAndCollect(async () => {
      await Assertions.checkIfValueIsDefined(cardViewed);
    }, 'Check Card Viewed event');

    const checkCardHomeClicked = softAssert.checkAndCollect(async () => {
      await Assertions.checkIfValueIsDefined(cardHomeClicked);
    }, 'Check Card Home Clicked event');

    await Promise.all([checkCardViewed, checkCardHomeClicked]);
    softAssert.throwIfErrors();
  });
});
