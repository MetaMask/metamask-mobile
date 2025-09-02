import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNodeType } from '../../framework/types';
import SoftAssert from '../../utils/SoftAssert';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import Assertions from '../../framework/Assertions';
import { defaultGanacheOptions } from '../../framework/Constants';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import { SmokeTrade } from '../../tags';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import { EventPayload, getEventsPayloads } from '../analytics/helpers';
import { submitSwapUnifiedUI } from './helpers/swapUnifiedUI';
import { loginToApp } from '../../viewHelper';
import { prepareSwapsTestEnvironment } from './helpers/prepareSwapsTestEnvironment';
import { logger } from '../../framework/logger';
import { testSpecificMock } from './helpers/swap-mocks';

const EVENT_NAMES = {
  SWAP_STARTED: 'Swap Started',
  SWAP_COMPLETED: 'Swap Completed',
  SWAPS_OPENED: 'Swaps Opened',
  QUOTES_RECEIVED: 'Quotes Received',
};

describe(SmokeTrade('Swap from Actions'), (): void => {
  const FIRST_ROW: number = 0;
  const SECOND_ROW: number = 1;
  let capturedEvents: EventPayload[] = [];

  beforeEach(async (): Promise<void> => {
    jest.setTimeout(120000);
  });

  it.each`
    type      | quantity | sourceTokenSymbol | destTokenSymbol | chainId
    ${'swap'} | ${'1'}   | ${'ETH'}          | ${'USDC'}       | ${'0x1'}
  `(
    "should $type token '$sourceTokenSymbol' to '$destTokenSymbol' on chainID='$chainId'",
    async ({
      type,
      quantity,
      sourceTokenSymbol,
      destTokenSymbol,
      chainId,
    }): Promise<void> => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withGanacheNetwork('0x1')
            .withMetaMetricsOptIn()
            .withDisabledSmartTransactions()
            .build(),
          localNodeOptions: [
            {
              type: LocalNodeType.ganache,
              options: {
                ...defaultGanacheOptions,
                chainId: 1,
              },
            },
          ],
          testSpecificMock,
          restartDevice: true,
          endTestfn: async ({ mockServer }) => {
            try {
              // Capture all events without filtering.
              // When fixing the test skipped below the filter needs to be applied there.
              capturedEvents = await getEventsPayloads(mockServer, [], 30000);
            } catch (error: unknown) {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              logger.error(`Error capturing events: ${errorMessage}`);
            }
          },
        },
        async () => {
          await loginToApp();
          await prepareSwapsTestEnvironment();
          await TabBarComponent.tapActions();
          await Assertions.expectElementToBeVisible(
            WalletActionsBottomSheet.swapButton,
          );
          await WalletActionsBottomSheet.tapSwapButton();

          // Submit the Swap
          await submitSwapUnifiedUI(
            quantity,
            sourceTokenSymbol,
            destTokenSymbol,
            chainId,
          );

          // Check the swap activity completed
          await Assertions.expectElementToBeVisible(ActivitiesView.title);
          await Assertions.expectElementToHaveText(
            ActivitiesView.transactionStatus(FIRST_ROW),
            ActivitiesViewSelectorsText.CONFIRM_TEXT,
          );

          // Check the token approval completed
          if (type === 'unapproved') {
            await Assertions.expectElementToBeVisible(
              ActivitiesView.tokenApprovalActivity(sourceTokenSymbol),
            );
            await Assertions.expectElementToHaveText(
              ActivitiesView.transactionStatus(SECOND_ROW),
              ActivitiesViewSelectorsText.CONFIRM_TEXT,
            );
          }
        },
      );
    },
  );

  it.skip('should validate segment/metametric events for a successful swap', async (): Promise<void> => {
    const testCases = [
      {
        type: 'swap',
        sourceTokenSymbol: 'ETH',
        destTokenSymbol: 'USDC',
        quantity: '1',
      },
      {
        type: 'swap',
        sourceTokenSymbol: 'USDC',
        destTokenSymbol: 'ETH',
        quantity: '19',
      },
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

    // METAMETRICS EVENTS
    const events = capturedEvents;

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
