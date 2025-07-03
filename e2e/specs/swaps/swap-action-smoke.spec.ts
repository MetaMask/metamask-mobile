'use strict';
import { ethers } from 'ethers';
import { MockttpServer } from 'mockttp';
import type { IndexableNativeElement } from 'detox/detox';
import { loginToApp } from '../../viewHelper.js';
import QuoteView from '../../pages/swaps/QuoteView';
import SwapView from '../../pages/swaps/SwapView';
import TabBarComponent from '../../pages/wallet/TabBarComponent.js';
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
import NetworkListModal from '../../pages/Network/NetworkListModal.js';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal.js';
import TestHelpers from '../../helpers.js';
import FixtureServer from '../../fixtures/fixture-server.js';
import { getFixturesServerPort } from '../../fixtures/utils.js';
import { SmokeTrade } from '../../tags.js';
import Assertions from '../../utils/Assertions.js';
import ActivitiesView from '../../pages/Transactions/ActivitiesView.js';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import { mockEvents } from '../../api-mocking/mock-config/mock-events.js';
import { getEventsPayloads } from '../analytics/helpers';
import {
  startMockServer,
  stopMockServer,
} from '../../api-mocking/mock-server.js';
import SoftAssert from '../../utils/SoftAssert.ts';
import { prepareSwapsTestEnvironment } from './helpers/prepareSwapsTestEnvironment.ts';

const fixtureServer: FixtureServer = new FixtureServer();
const firstElement: number = 0;

let mockServer: MockttpServer;

describe(SmokeTrade('Swap from Actions'), (): void => {
  const FIRST_ROW: number = 0;
  const SECOND_ROW: number = 1;
  let currentNetwork: string =
    CustomNetworks.Tenderly.Mainnet.providerConfig.nickname;
  const wallet: ethers.Wallet = ethers.Wallet.createRandom();

  beforeAll(async (): Promise<void> => {
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
    await prepareSwapsTestEnvironment(wallet);
  });

  afterAll(async (): Promise<void> => {
    await stopFixtureServer(fixtureServer);
    await stopMockServer(mockServer);
  });

  beforeEach(async (): Promise<void> => {
    jest.setTimeout(120000);
  });

  it.each`
    type        | quantity | sourceTokenSymbol | destTokenSymbol | network
    ${'wrap'}   | ${'.03'} | ${'ETH'}          | ${'WETH'}       | ${CustomNetworks.Tenderly.Mainnet}
    ${'unwrap'} | ${'.01'} | ${'WETH'}         | ${'ETH'}        | ${CustomNetworks.Tenderly.Mainnet}
  `(
    "should swap $type token '$sourceTokenSymbol' to '$destTokenSymbol' on '$network.providerConfig.nickname'",
    async ({
      type,
      quantity,
      sourceTokenSymbol,
      destTokenSymbol,
      network,
    }): Promise<void> => {
      await TabBarComponent.tapWallet();

      if (network.providerConfig.nickname !== currentNetwork) {
        await WalletView.tapNetworksButtonOnNavBar();
        await Assertions.checkIfToggleIsOn(
          NetworkListModal.testNetToggle as Promise<IndexableNativeElement>,
        );
        await NetworkListModal.changeNetworkTo(
          network.providerConfig.nickname,
          false,
        );
        await NetworkEducationModal.tapGotItButton();
        await TestHelpers.delay(3000);
        currentNetwork = network.providerConfig.nickname;
      }

      await Assertions.checkIfVisible(WalletView.container);
      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapSwapButton();
      await Assertions.checkIfVisible(QuoteView.getQuotes);

      //Select source token, if native tiken can skip because already selected
      if (type !== 'native' && type !== 'wrap') {
        await QuoteView.tapOnSelectSourceToken();
        await QuoteView.tapSearchToken();
        await QuoteView.typeSearchToken(sourceTokenSymbol);
        await TestHelpers.delay(2000);
        await QuoteView.selectToken(sourceTokenSymbol, 1);
      }
      await QuoteView.enterSwapAmount(quantity);

      //Select destination token
      await QuoteView.tapOnSelectDestToken();
      if (destTokenSymbol !== 'ETH') {
        await QuoteView.tapSearchToken();
        await QuoteView.typeSearchToken(destTokenSymbol);
        await TestHelpers.delay(2000);
        await QuoteView.selectToken(destTokenSymbol, 1);
      } else await QuoteView.selectToken(destTokenSymbol, firstElement);

      //Make sure slippage is zero for wrapped tokens
      if (sourceTokenSymbol === 'WETH' || destTokenSymbol === 'WETH') {
        await Assertions.checkIfElementToHaveText(
          QuoteView.maxSlippage,
          'Max slippage 0%',
        );
      }
      // This call is needed because otherwise the device never becomes idle
      await device.disableSynchronization();

      await QuoteView.tapOnGetQuotes();
      await Assertions.checkIfVisible(SwapView.quoteSummary);
      await Assertions.checkIfVisible(SwapView.gasFee);
      await SwapView.tapIUnderstandPriceWarning();
      await Assertions.checkIfVisible(SwapView.swapButton);
      await TestHelpers.delay(2000);
      await SwapView.tapSwapButton();
      //Wait for Swap to complete
      try {
        await Assertions.checkIfTextIsDisplayed(
          SwapView.generateSwapCompleteLabel(
            sourceTokenSymbol,
            destTokenSymbol,
          ),
          30000,
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`Swap complete didn't pop up: ${e}`);
      }
      await device.enableSynchronization();
      await TestHelpers.delay(10000);

      // Check the swap activity completed
      await TabBarComponent.tapActivity();
      await Assertions.checkIfVisible(ActivitiesView.title);
      await Assertions.checkIfVisible(
        ActivitiesView.swapActivityTitle(sourceTokenSymbol, destTokenSymbol),
      );
      await Assertions.checkIfElementToHaveText(
        ActivitiesView.transactionStatus(FIRST_ROW),
        ActivitiesViewSelectorsText.CONFIRM_TEXT,
        120000,
      );

      // Check the token approval completed
      if (type === 'unapproved') {
        await Assertions.checkIfVisible(
          ActivitiesView.tokenApprovalActivity(sourceTokenSymbol),
        );
        await Assertions.checkIfElementToHaveText(
          ActivitiesView.transactionStatus(SECOND_ROW),
          ActivitiesViewSelectorsText.CONFIRM_TEXT,
          120000,
        );
      }
    },
  );

  it('should validate segment/metametric events for a successful swap', async (): Promise<void> => {
    const testCases = [
      {
        type: 'wrap',
        sourceTokenSymbol: 'ETH',
        destTokenSymbol: 'WETH',
        quantity: '0.03',
      },
      {
        type: 'unwrap',
        sourceTokenSymbol: 'WETH',
        destTokenSymbol: 'ETH',
        quantity: '0.01',
      },
    ];

    const EVENT_NAMES = {
      SWAP_STARTED: 'Swap Started',
      SWAP_COMPLETED: 'Swap Completed',
      SWAPS_OPENED: 'Swaps Opened',
      QUOTES_RECEIVED: 'Quotes Received',
    };

    // METAMETRICS EVENTS
    const events = await getEventsPayloads(
      mockServer,
      Object.values(EVENT_NAMES),
    );

    const softAssert: SoftAssert = new SoftAssert();

    // Filter events by type
    const swapsOpenedEvents = events.filter(
      (e) => e.event === EVENT_NAMES.SWAPS_OPENED,
    );
    const quotesReceivedEvents = events.filter(
      (e) => e.event === EVENT_NAMES.QUOTES_RECEIVED,
    );
    const swapStartedEvents = events.filter(
      (e) => e.event === EVENT_NAMES.SWAP_STARTED,
    );
    const swapCompletedEvents = events.filter(
      (e) => e.event === EVENT_NAMES.SWAP_COMPLETED,
    );

    const checkEventCount = softAssert.checkAndCollect(
      () => Assertions.checkIfArrayHasLength(events, 8),
      `Events: Should have 8 events (2 for each type)`,
    );

    const checkSwapsOpenedCount = softAssert.checkAndCollect(
      () =>
        Assertions.checkIfArrayHasLength(swapsOpenedEvents, testCases.length),
      'Swaps Opened: Should have 2 events',
    );

    const checkQuotesReceivedCount = softAssert.checkAndCollect(
      () =>
        Assertions.checkIfArrayHasLength(
          quotesReceivedEvents,
          testCases.length,
        ),
      'Swap Completed: Should have 2 events',
    );

    const checkSwapStartedCount = softAssert.checkAndCollect(
      () =>
        Assertions.checkIfArrayHasLength(swapStartedEvents, testCases.length),
      'Swap Started: Should have 2 events',
    );

    const checkSwapCompletedCount = softAssert.checkAndCollect(
      () =>
        Assertions.checkIfArrayHasLength(swapCompletedEvents, testCases.length),
      'Swap Completed: Should have 2 events',
    );

    const swapsOpenedAssertions = [];
    for (let i = 0; i < swapsOpenedEvents.length; i++) {
      swapsOpenedAssertions.push(
        softAssert.checkAndCollect(async () => {
          Assertions.checkIfObjectContains(swapsOpenedEvents[i].properties, {
            action: 'Swap',
            name: 'Swaps',
            source: 'MainView',
            chain_id: '1',
          });
        }, `Swaps Opened [${i}]: Check properties (sourceToken: ${testCases[i]?.sourceTokenSymbol})`),
      );
    }

    const quotesReceivedAssertions = [];
    for (let i = 0; i < quotesReceivedEvents.length; i++) {
      quotesReceivedAssertions.push(
        softAssert.checkAndCollect(async () => {
          Assertions.checkIfObjectContains(quotesReceivedEvents[i].properties, {
            action: 'Quote',
            name: 'Swaps',
            token_from: testCases[i].sourceTokenSymbol,
            token_to: testCases[i].destTokenSymbol,
            request_type: 'Order',
            slippage: 0,
            custom_slippage: true,
            best_quote_source: 'wrappedNative',
            available_quotes: 1,
            chain_id: '1',
            token_from_amount: testCases[i].quantity,
            token_to_amount: testCases[i].quantity,
          });
        }, `Quotes Received [${i}]: Check properties (sourceToken: ${testCases[i]?.sourceTokenSymbol})`),
        softAssert.checkAndCollect(
          () =>
            Assertions.checkIfValueIsDefined(
              quotesReceivedEvents[i].properties.response_time,
            ),
          `Quotes Received [${i}]: Check response_time (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
        ),
        softAssert.checkAndCollect(
          () =>
            Assertions.checkIfValueIsDefined(
              quotesReceivedEvents[i].properties.network_fees_USD,
            ),
          `Quotes Received [${i}]: Check network_fees_USD (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
        ),
        softAssert.checkAndCollect(
          () =>
            Assertions.checkIfValueIsDefined(
              quotesReceivedEvents[i].properties.network_fees_ETH,
            ),
          `Quotes Received [${i}]: Check network_fees_ETH (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
        ),
      );
    }

    const swapStartedAssertions = [];
    for (let i = 0; i < swapStartedEvents.length; i++) {
      swapStartedAssertions.push(
        softAssert.checkAndCollect(async () => {
          Assertions.checkIfObjectContains(swapStartedEvents[i].properties, {
            action: 'Swap',
            name: 'Swaps',
            account_type: 'Imported',
            token_from: testCases[i].sourceTokenSymbol,
            token_to: testCases[i].destTokenSymbol,
            request_type: 'Order',
            custom_slippage: true,
            best_quote_source: 'wrappedNative',
            available_quotes: 1,
            other_quote_selected: false,
            chain_id: '1',
            is_smart_transaction: false,
            gas_included: false,
            token_from_amount: testCases[i].quantity,
            token_to_amount: testCases[i].quantity,
          });
        }, `Swap Started [${i}]: Check properties (sourceToken: ${testCases[i]?.sourceTokenSymbol})`),
        softAssert.checkAndCollect(
          () =>
            Assertions.checkIfValueIsDefined(
              quotesReceivedEvents[i].properties.network_fees_USD,
            ),
          `Swap Started [${i}]: Check network_fees_USD (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
        ),
        softAssert.checkAndCollect(
          () =>
            Assertions.checkIfValueIsDefined(
              quotesReceivedEvents[i].properties.network_fees_ETH,
            ),
          `Swap Started [${i}]: Check network_fees_ETH (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
        ),
      );
    }

    const swapCompletedAssertions = [];
    for (let i = 0; i < swapCompletedEvents.length; i++) {
      swapCompletedAssertions.push(
        softAssert.checkAndCollect(async () => {
          Assertions.checkIfObjectContains(swapCompletedEvents[i].properties, {
            action: 'Swap',
            name: 'Swaps',
            custom_slippage: true,
            best_quote_source: 'wrappedNative',
            available_quotes: 1,
            chain_id: '1',
            is_smart_transaction: false,
            other_quote_selected: false,
            request_type: 'Order',
            token_from: testCases[i].sourceTokenSymbol,
            token_to: testCases[i].destTokenSymbol,
            token_from_amount: testCases[i].quantity,
            token_to_amount: testCases[i].quantity,
            token_to_amount_received: 'NaN',
          });
        }, `Swap Completed [${i}]: Check properties (sourceToken: ${testCases[i]?.sourceTokenSymbol})`),
        softAssert.checkAndCollect(
          () =>
            Assertions.checkIfValueIsDefined(
              quotesReceivedEvents[i].properties.network_fees_USD,
            ),
          `Swap Completed [${i}]: Check network_fees_USD (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
        ),
        softAssert.checkAndCollect(
          () =>
            Assertions.checkIfValueIsDefined(
              quotesReceivedEvents[i].properties.network_fees_ETH,
            ),
          `Swap Completed [${i}]: Check network_fees_ETH (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
        ),
        softAssert.checkAndCollect(
          () =>
            Assertions.checkIfValueIsDefined(
              swapCompletedEvents[i].properties.time_to_mine,
            ),
          `Swap Completed [${i}]: Check time_to_mine (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
        ),
        softAssert.checkAndCollect(
          () =>
            Assertions.checkIfValueIsDefined(
              swapCompletedEvents[i].properties.estimated_vs_used_gasRatio,
            ),
          `Swap Completed [${i}]: Check estimated_vs_used_gasRatio (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
        ),
        softAssert.checkAndCollect(
          () =>
            Assertions.checkIfValueIsDefined(
              swapCompletedEvents[i].properties.quote_vs_executionRatio,
            ),
          `Swap Completed [${i}]: Check quote_vs_executionRatio (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
        ),
      );
    }

    
    await Promise.all([
      checkEventCount,
      checkSwapsOpenedCount,
      checkQuotesReceivedCount,
      checkSwapStartedCount,
      checkSwapCompletedCount,
      ...swapsOpenedAssertions,
      ...quotesReceivedAssertions,
      ...swapStartedAssertions,
      ...swapCompletedAssertions,
    ]);

    softAssert.throwIfErrors();
  });
});
