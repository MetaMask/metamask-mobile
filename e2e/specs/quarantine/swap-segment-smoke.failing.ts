import { ethers } from 'ethers';
import { loginToApp } from '../../viewHelper';
import QuoteView from '../../pages/swaps/QuoteView.ts';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletView from '../../pages/wallet/WalletView';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import Tenderly from '../../tenderly.js';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../framework/fixtures/FixtureHelper';
import { CustomNetworks } from '../../resources/networks.e2e.js';
import TestHelpers from '../../helpers.js';
import FixtureServer from '../../framework/fixtures/FixtureServer';
import { getFixturesServerPort } from '../../framework/fixtures/FixtureUtils';
import { SmokeTrade } from '../../tags';
import Assertions from '../../framework/Assertions';
import { mockEvents } from '../../api-mocking/mock-config/mock-events.js';
import { getEventsPayloads } from '../analytics/helpers.ts';
import {
  startMockServer,
  stopMockServer,
} from '../../api-mocking/mock-server.js';
import SoftAssert from '../../utils/SoftAssert';
import { prepareSwapsTestEnvironment } from '../swaps/helpers/prepareSwapsTestEnvironment';
import SwapView from '../../pages/swaps/SwapView';
import QuotesModal from '../../pages/swaps/QuoteModal';
import type { MockttpServer } from 'mockttp';

const fixtureServer = new FixtureServer();

let mockServer: MockttpServer;

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe(SmokeTrade('Swaps - Metametrics'), () => {
  const wallet = ethers.Wallet.createRandom();

  beforeAll(async () => {
    await Tenderly.addFunds(
      CustomNetworks.Tenderly.Mainnet.providerConfig.rpcUrl,
      wallet.address,
    );

    // Start the mock server to get the segment events
    const segmentMock = {
      POST: [mockEvents.POST.segmentTrack],
    };
    mockServer = await startMockServer(segmentMock);

    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(CustomNetworks.Tenderly.Mainnet)
      .withMetaMetricsOptIn()
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: {
        fixtureServerPort: `${getFixturesServerPort()}`,
      },
    });
    await loginToApp();
    await prepareSwapsTestEnvironment();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
    await stopMockServer(mockServer);
  });

  beforeEach(async () => {
    jest.setTimeout(120000);
  });

  it('should start a swap and cancel it to test the cancel event', async () => {
    await TabBarComponent.tapWallet();
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapSwapButton();

    await QuoteView.tapDestToken();
    await QuoteView.tapSearchToken();
    await QuoteView.typeSearchToken('DAI');
    await TestHelpers.delay(3000);
    await QuoteView.selectToken('DAI');
    await QuoteView.enterAmount('0.01');
    // This is to ensure we tap cancel before quotes are fetched - the cancel event is only sent if the quotes are not fetched
    await device.disableSynchronization();
    await TestHelpers.delay(1000);
    await QuoteView.tapOnCancelButton();
    await device.enableSynchronization();
    await Assertions.expectElementToBeVisible(WalletView.container);
  });

  it('should start a swap and open all available quotes to test the event', async () => {
    await TabBarComponent.tapWallet();
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapSwapButton();

    await QuoteView.tapSearchToken();
    await QuoteView.tapSearchToken();
    await QuoteView.typeSearchToken('DAI');
    await TestHelpers.delay(3000);
    await QuoteView.selectToken('DAI');
    await QuoteView.enterAmount('0.01');
    await Assertions.expectElementToBeVisible(SwapView.quoteSummary);
    await SwapView.tapIUnderstandPriceWarning();
    await device.disableSynchronization();
    await SwapView.tapViewDetailsAllQuotes();
    await Assertions.expectElementToBeVisible(QuotesModal.header);
    await QuotesModal.close();
    await Assertions.expectElementToNotBeVisible(QuotesModal.header);
    await device.enableSynchronization();
  });

  it('should validate segment/metametric events for a cancel and viewing all available quotes', async () => {
    const EVENT_NAMES = {
      QUOTES_REQUEST_CANCELLED: 'Quotes Request Cancelled',
      ALL_AVAILABLE_QUOTES_OPENED: 'All Available Quotes Opened',
    };

    const events = await getEventsPayloads(
      mockServer,
      Object.values(EVENT_NAMES),
    );

    const softAssert = new SoftAssert();

    await softAssert.checkAndCollect(
      () => Assertions.checkIfArrayHasLength(events, 2),
      `Events: Should have 2 events`,
    );

    const allAvailableQuotesOpenedEvent = events.find(
      (e: SegmentEvent) => e.event === EVENT_NAMES.ALL_AVAILABLE_QUOTES_OPENED,
    ) as SegmentEvent;

    await softAssert.checkAndCollect(
      async () =>
        Assertions.checkIfObjectContains(
          allAvailableQuotesOpenedEvent.properties,
          {
            action: 'Quote',
            name: 'Swaps',
            token_from: 'ETH',
            token_to: 'DAI',
            request_type: 'Order',
            slippage: 2,
            custom_slippage: false,
            chain_id: '1',
            token_from_amount: '0.01',
          },
        ),
      'All Available Quotes Opened: Check main properties',
    );

    await softAssert.checkAndCollect(
      () =>
        Assertions.checkIfValueIsDefined(
          allAvailableQuotesOpenedEvent.properties.response_time,
        ),
      'All Available Quotes Opened: Check response_time',
    );

    await softAssert.checkAndCollect(
      () =>
        Assertions.checkIfValueIsDefined(
          allAvailableQuotesOpenedEvent.properties.best_quote_source,
        ),
      'All Available Quotes Opened: Check best_quote_source',
    );

    await softAssert.checkAndCollect(
      () =>
        Assertions.checkIfValueIsDefined(
          allAvailableQuotesOpenedEvent.properties.network_fees_USD,
        ),
      'All Available Quotes Opened: Check network_fees_USD',
    );

    await softAssert.checkAndCollect(
      () =>
        Assertions.checkIfValueIsDefined(
          allAvailableQuotesOpenedEvent.properties.network_fees_ETH,
        ),
      'All Available Quotes Opened: Check network_fees_ETH',
    );

    await softAssert.checkAndCollect(
      () =>
        Assertions.checkIfValueIsDefined(
          allAvailableQuotesOpenedEvent.properties.available_quotes,
        ),
      'All Available Quotes Opened: Check available_quotes',
    );

    await softAssert.checkAndCollect(
      () =>
        Assertions.checkIfValueIsDefined(
          allAvailableQuotesOpenedEvent.properties.token_to_amount,
        ),
      'All Available Quotes Opened: Check token_to_amount',
    );

    const quotesRequestCancelledEvent = events.find(
      (e: SegmentEvent) => e.event === EVENT_NAMES.QUOTES_REQUEST_CANCELLED,
    ) as SegmentEvent;

    await softAssert.checkAndCollect(
      async () =>
        Assertions.checkIfObjectContains(
          quotesRequestCancelledEvent.properties,
          {
            action: 'Quote',
            name: 'Swaps',
            token_from: 'ETH',
            token_to: 'DAI',
            request_type: 'Order',
            custom_slippage: false,
            chain_id: '1',
            token_from_amount: '0.01',
          },
        ),
      'Quotes Request Cancelled: Check properties',
    );

    await softAssert.checkAndCollect(
      () =>
        Assertions.checkIfValueIsDefined(
          quotesRequestCancelledEvent.properties.responseTime,
        ),
      'Quotes Request Cancelled: Check responseTime',
    );

    softAssert.throwIfErrors();
  });
});

// TODO: move this to a shared file when migrating other tests to TypeScript
interface SegmentEvent {
  event: string;
  properties: Record<string, unknown>;
}
