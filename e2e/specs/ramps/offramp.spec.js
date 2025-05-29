'use strict';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { CustomNetworks } from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort , getMockServerPort } from '../../fixtures/utils';
import { SmokeTrade } from '../../tags';
import Assertions from '../../utils/Assertions';
import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import QuotesView from '../../pages/Ramps/QuotesView';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { getEventsPayloads } from '../analytics/helpers';
import SoftAssert from '../../utils/SoftAssert';

const fixtureServer = new FixtureServer();

const franceRegion = {
  currencies: ['/currencies/fiat/eur'],
  emoji: '🇫🇷',
  id: '/regions/fr',
  name: 'France',
  support: { buy: true, sell: true, recurringBuy: true },
  unsupported: false,
  recommended: false,
  detected: false,
};

let mockServer;
let mockServerPort;

describe(SmokeTrade('Off-Ramp'), () => {
  beforeAll(async () => {
    const segmentMock = {
      POST: [mockEvents.POST.segmentTrack],
    };

    mockServerPort = getMockServerPort();
    mockServer = await startMockServer(segmentMock, mockServerPort);

    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(CustomNetworks.Tenderly.Mainnet)
      .withRampsSelectedRegion(franceRegion)
      .withMetaMetricsOptIn()
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: {
        fixtureServerPort: `${getFixturesServerPort()}`,
        mockServerPort,
        sendMetaMetricsinE2E: true,
      },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
    await stopMockServer(mockServer);
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should get to the Amount to sell screen, after selecting Get Started', async () => {
    await TabBarComponent.tapWallet();
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapSellButton();
    await SellGetStartedView.tapGetStartedButton();
    await Assertions.checkIfVisible(BuildQuoteView.amountToSellLabel);
    await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);
    await BuildQuoteView.tapCancelButton();
  });

  it('should show quotes', async () => {
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapSellButton();
    await BuildQuoteView.enterAmount('2');
    await BuildQuoteView.tapGetQuotesButton();
    await Assertions.checkIfVisible(QuotesView.quotes);
  });

  it('should validate segment/metametric events for a successful offramp flow', async () => {
    const expectedEvents = {
      SELL_BUTTON_CLICKED: 'Sell Button Clicked',
      SELL_GET_STARTED_CLICKED: 'Sell Get Started Clicked',
      SELL_QUOTES_REQUESTED: 'Sell Quotes Requested',
      SELL_QUOTES_RECEIVED: 'Sell Quotes Received',
    };

    const events = await getEventsPayloads(mockServer);
    let counter = 0;
    for (const event of events) {
      console.log(`${counter}: ${event.event}: ${JSON.stringify(event.properties)}`);
      counter += 1;
    }

    const softAssert = new SoftAssert();

    await softAssert.checkAndCollect(async () => {
      await Assertions.checkIfValueIsPresent(expectedEvents.SELL_BUTTON_CLICKED);
    });
  });
});
