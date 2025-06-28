'use strict';
import { ethers } from 'ethers';
import { MockttpServer } from 'mockttp';
import { loginToApp } from '../../viewHelper.js';
import TabBarComponent from '../../pages/wallet/TabBarComponent.js';
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
import ActivitiesView from '../../pages/Transactions/ActivitiesView.js';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import { mockEvents } from '../../api-mocking/mock-config/mock-events.js';
import { getEventsPayloads } from '../analytics/helpers';
import {
  startMockServer,
  stopMockServer,
} from '../../api-mocking/mock-server.js';
import SoftAssert from '../../utils/SoftAssert.ts';
import { prepareSwapsTestEnvironment, isUnifiedUIEnabledForChain } from './helpers/prepareSwapsTestEnvironment.ts';
import { submitSwapLegacyUI } from './helpers/swapLegacyUI';
import { submitSwapUnifiedUI } from './helpers/swapUnifiedUI';
const fixtureServer: FixtureServer = new FixtureServer();

let mockServer: MockttpServer;

describe(SmokeTrade('Swap from Actions'), (): void => {
  const FIRST_ROW: number = 0;
  const SECOND_ROW: number = 1;
  const wallet: ethers.Wallet = ethers.Wallet.createRandom();
  let isUnifiedUIEnabled: boolean | undefined;
  const isBuildTypeFlask = process.env.METAMASK_BUILD_TYPE === "flask";

  beforeAll(async (): Promise<void> => {
    isUnifiedUIEnabled = await isUnifiedUIEnabledForChain('1');

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
    ${'swap'}   | ${'1'}   | ${'ETH'}          | ${'USDT'}       | ${CustomNetworks.Tenderly.Mainnet}
    ${'swap'}   | ${'10'}  | ${'USDT'}         | ${'ETH'}        | ${CustomNetworks.Tenderly.Mainnet}
    ${'wrap'}   | ${'.03'} | ${'ETH'}          | ${'WETH'}       | ${CustomNetworks.Tenderly.Mainnet}
    ${'unwrap'} | ${'.01'} | ${'WETH'}         | ${'ETH'}        | ${CustomNetworks.Tenderly.Mainnet}
  `(
    "should $type token '$sourceTokenSymbol' to '$destTokenSymbol' on '$network.providerConfig.nickname'",
    async ({ type, quantity, sourceTokenSymbol, destTokenSymbol, network }): Promise<void> => {
       await TabBarComponent.tapActions();
       await Assertions.checkIfVisible(WalletActionsBottomSheet.swapButton);
       await WalletActionsBottomSheet.tapSwapButton();

       // Submit the Swap
       if (isUnifiedUIEnabled && isBuildTypeFlask) {
         await submitSwapUnifiedUI(
           type,
           quantity,
           sourceTokenSymbol,
           destTokenSymbol,
           network.providerConfig.chainId,
         );
       } else {
         await submitSwapLegacyUI(
           quantity,
           sourceTokenSymbol,
           destTokenSymbol,
         );
        await TabBarComponent.tapActivity();
       }

      // Check the swap activity completed
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

  it.skip('should validate segment/metametric events for a successful swap', async (): Promise<void> => {

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
      // SWAP_PAGE_VIEWED: 'Swap Page Viewed', - this event is not sent in the current implementation, but it should be working. We should create an issue to fix it.
    };

    // METAMETRICS EVENTS
    const events = await getEventsPayloads(mockServer, Object.values(EVENT_NAMES));

    const softAssert: SoftAssert = new SoftAssert();

    await softAssert.checkAndCollect(
      () => Assertions.checkIfArrayHasLength(events, 8),
      `Events: Should have 8 events (2 for each type)`, // TODO: change to 10 when SWAP_PAGE_VIEWED is fixed
    );

    // Assert Swaps Opened events
    const swapsOpenedEvents = events.filter(
      (e) => e.event === EVENT_NAMES.SWAPS_OPENED,
    );

    await softAssert.checkAndCollect(
      () =>
        Assertions.checkIfArrayHasLength(swapsOpenedEvents, testCases.length),
      'Swaps Opened: Should have 2 events',
    );

    for (let i = 0; i < swapsOpenedEvents.length; i++) {
      await softAssert.checkAndCollect(
        async () => {
          Assertions.checkIfObjectContains(swapsOpenedEvents[i].properties, {
            action: 'Swap',
            name: 'Swaps',
            source: 'MainView',
            chain_id: '1',
          });
        },
        `Swaps Opened [${i}]: Check properties (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );
    }

    // Assert Quotes Received events
    const quotesReceivedEvents = events.filter(
      (e) => e.event === EVENT_NAMES.QUOTES_RECEIVED,
    );

    await softAssert.checkAndCollect(
      () =>
        Assertions.checkIfArrayHasLength(
          quotesReceivedEvents,
          testCases.length,
        ),
      'Swap Completed: Should have 2 events',
    );

    for (let i = 0; i < quotesReceivedEvents.length; i++) {
      await softAssert.checkAndCollect(
        async () => {
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
        },
        `Quotes Received [${i}]: Check properties (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsDefined(
            quotesReceivedEvents[i].properties.response_time,
          ),
        `Quotes Received [${i}]: Check response_time (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsDefined(
            quotesReceivedEvents[i].properties.network_fees_USD,
          ),
        `Quotes Received [${i}]: Check network_fees_USD (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsDefined(
            quotesReceivedEvents[i].properties.network_fees_ETH,
          ),
        `Quotes Received [${i}]: Check network_fees_ETH (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );
    }

    // Assert Swap Started event
    const swapStartedEvents = events.filter((e) => e.event === EVENT_NAMES.SWAP_STARTED);

    await softAssert.checkAndCollect(
      () =>
        Assertions.checkIfArrayHasLength(swapStartedEvents, testCases.length),
      'Swap Started: Should have 2 events',
    );

    for (let i = 0; i < swapStartedEvents.length; i++) {
      await softAssert.checkAndCollect(
        async () => {
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
        },
        `Swap Started [${i}]: Check properties (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsDefined(
            quotesReceivedEvents[i].properties.network_fees_USD,
          ),
        `Swap Started [${i}]: Check network_fees_USD (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsDefined(
            quotesReceivedEvents[i].properties.network_fees_ETH,
          ),
        `Swap Started [${i}]: Check network_fees_ETH (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );
    }

    // Assert Swap Completed events
    const swapCompletedEvents = events.filter(
      (e) => e.event === EVENT_NAMES.SWAP_COMPLETED,
    );

    await softAssert.checkAndCollect(
      () =>
        Assertions.checkIfArrayHasLength(swapCompletedEvents, testCases.length),
      'Swap Completed: Should have 2 events',
    );

    for (let i = 0; i < swapCompletedEvents.length; i++) {
      await softAssert.checkAndCollect(
        async () => {
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
        },
        `Swap Completed [${i}]: Check properties (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsDefined(
            quotesReceivedEvents[i].properties.network_fees_USD,
          ),
        `Swap Completed [${i}]: Check network_fees_USD (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsDefined(
            quotesReceivedEvents[i].properties.network_fees_ETH,
          ),
        `Swap Completed [${i}]: Check network_fees_ETH (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsDefined(
            swapCompletedEvents[i].properties.time_to_mine,
          ),
        `Swap Completed [${i}]: Check time_to_mine (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsDefined(
            swapCompletedEvents[i].properties.estimated_vs_used_gasRatio,
          ),
        `Swap Completed [${i}]: Check estimated_vs_used_gasRatio (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsDefined(
            swapCompletedEvents[i].properties.quote_vs_executionRatio,
          ),
        `Swap Completed [${i}]: Check quote_vs_executionRatio (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );
    }

    softAssert.throwIfErrors();
  });
});
