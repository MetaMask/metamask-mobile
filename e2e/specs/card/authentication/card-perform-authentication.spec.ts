import { SmokeCard } from '../../../tags';
import { loginToApp } from '../../../viewHelper';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { testSpecificMock } from '../../../api-mocking/mock-responses/cardholder-mocks';
import { EventPayload, getEventsPayloads } from '../../analytics/helpers';
import { CustomNetworks } from '../../../resources/networks.e2e';
import { Assertions } from '../../../framework';
import WalletView from '../../../pages/wallet/WalletView';
import CardHomeView from '../../../pages/Card/CardHomeView';

describe(SmokeCard('Card Perform Authentication'), () => {
  const eventsToCheck: EventPayload[] = [];

  const setupCardPerformAuthenticationTest = async (
    testFunction: () => Promise<void>,
  ) => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withMetaMetricsOptIn()
          .withNetworkController(CustomNetworks.Tenderly.Linea)
          .withAccountTreeController()
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

  it('should open Card Home when pressing card navbar button', async () => {
    await setupCardPerformAuthenticationTest(async () => {
      await Assertions.expectElementToBeVisible(WalletView.navbarCardButton);
      await Assertions.expectElementToBeVisible(
        WalletView.navbarCardButtonBadge,
      );
      await WalletView.tapNavbarCardButton();
      await Assertions.expectElementToBeVisible(CardHomeView.cardViewTitle);
    });
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });
});
