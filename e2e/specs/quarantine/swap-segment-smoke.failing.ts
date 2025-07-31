import { ethers } from 'ethers';
import { loginToApp } from '../../viewHelper.js';
import QuoteView from '../../pages/swaps/QuoteView.ts';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletView from '../../pages/wallet/WalletView.js';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet.js';
import FixtureBuilder from '../../fixtures/fixture-builder.js';
import Tenderly from '../../tenderly.js';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper.js';
import { CustomNetworks } from '../../resources/networks.e2e.js';
import TestHelpers from '../../helpers.js';
import FixtureServer from '../../fixtures/fixture-server.js';
import { getFixturesServerPort } from '../../fixtures/utils.js';
import { SmokeTrade } from '../../tags.js';
import Assertions from '../../utils/Assertions.js';
import { mockEvents } from '../../api-mocking/mock-config/mock-events.js';
import { getEventsPayloads } from '../analytics/helpers.ts';
import {
  startMockServer,
  stopMockServer,
} from '../../api-mocking/mock-server.js';
import SoftAssert from '../../utils/SoftAssert.ts';
import { prepareSwapsTestEnvironment } from '../swaps/helpers/prepareSwapsTestEnvironment.ts';
import SwapView from '../../pages/swaps/SwapView.ts';
import QuotesModal from '../../pages/swaps/QuoteModal.ts';
import type { MockttpServer } from 'mockttp';

const fixtureServer = new FixtureServer();

let mockServer: MockttpServer;

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

    await Assertions.checkIfVisible(QuoteView.getQuotes);

    await QuoteView.tapOnSelectDestToken();
    await QuoteView.tapSearchToken();
    await QuoteView.typeSearchToken('DAI');
    await TestHelpers.delay(3000);
    await QuoteView.selectToken('DAI');
    await QuoteView.enterSwapAmount('0.01');
    // This is to ensure we tap cancel before quotes are fetched - the cancel event is only sent if the quotes are not fetched
    await device.disableSynchronization();
    await QuoteView.tapOnGetQuotes();
    await TestHelpers.delay(1000);
    await QuoteView.tapOnCancelButton();
    await device.enableSynchronization();
    await Assertions.checkIfVisible(WalletView.container);
  });

  it('should start a swap and open all available quotes to test the event', async () => {
    await TabBarComponent.tapWallet();
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapSwapButton();

    await Assertions.checkIfVisible(QuoteView.getQuotes);
    await QuoteView.tapOnSelectDestToken();
    await QuoteView.tapSearchToken();
    await QuoteView.typeSearchToken('DAI');
    await TestHelpers.delay(3000);
    await QuoteView.selectToken('DAI');
    await QuoteView.enterSwapAmount('0.01');
    await QuoteView.tapOnGetQuotes();
    await Assertions.checkIfVisible(SwapView.quoteSummary);
    await SwapView.tapIUnderstandPriceWarning();
    await device.disableSynchronization();
    await SwapView.tapViewDetailsAllQuotes();
    await Assertions.checkIfVisible(QuotesModal.header);
    await QuotesModal.close();
    await Assertions.checkIfNotVisible(QuotesModal.header);
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
