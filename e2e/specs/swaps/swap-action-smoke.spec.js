'use strict';
import { ethers } from 'ethers';
import { loginToApp } from '../../viewHelper.js';
import QuoteView from '../../pages/swaps/QuoteView.js';
import SwapView from '../../pages/swaps/SwapView.js';
import TabBarComponent from '../../pages/wallet/TabBarComponent.js';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet.js';
import WalletView from '../../pages/wallet/WalletView.js';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet.js';
import SettingsView from '../../pages/Settings/SettingsView';
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
import ImportAccountView from '../../pages/importAccount/ImportAccountView.js';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView.js';
import Assertions from '../../utils/Assertions.js';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet.js';
import ActivitiesView from '../../pages/Transactions/ActivitiesView.js';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import AdvancedSettingsView from '../../pages/Settings/AdvancedView';
import { mockEvents } from '../../api-mocking/mock-config/mock-events.js';
import { getEventsPayloads } from '../analytics/helpers.js';
import {
  startMockServer,
  stopMockServer,
} from '../../api-mocking/mock-server.js';
import SoftAssert from '../../utils/SoftAssert.ts';

const fixtureServer = new FixtureServer();
const firstElement = 0;

let mockServer;

describe(SmokeTrade('Swap from Actions'), () => {
  const FIRST_ROW = 0;
  const SECOND_ROW = 1;
  let currentNetwork = CustomNetworks.Tenderly.Mainnet.providerConfig.nickname;
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
    jest.setTimeout(120000);
  });

  it('should turn off stx', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapAdvancedTitle();
    await AdvancedSettingsView.tapSmartTransactionSwitch();
    await TabBarComponent.tapWallet();
  });

  it('should be able to import account', async () => {
    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapImportAccount();
    await Assertions.checkIfVisible(ImportAccountView.container);
    await ImportAccountView.enterPrivateKey(wallet.privateKey);
    await Assertions.checkIfVisible(SuccessImportAccountView.container);
    await SuccessImportAccountView.tapCloseButton();
    await AccountListBottomSheet.swipeToDismissAccountsModal();
    await Assertions.checkIfVisible(WalletView.container);
  });

  it.each`
    type        | quantity | sourceTokenSymbol | destTokenSymbol | network
    ${'wrap'}   | ${'.03'} | ${'ETH'}          | ${'WETH'}       | ${CustomNetworks.Tenderly.Mainnet}
    ${'unwrap'} | ${'.01'} | ${'WETH'}         | ${'ETH'}        | ${CustomNetworks.Tenderly.Mainnet}
  `(
    "should swap $type token '$sourceTokenSymbol' to '$destTokenSymbol' on '$network.providerConfig.nickname'",
    async ({ type, quantity, sourceTokenSymbol, destTokenSymbol, network }) => {
      await TabBarComponent.tapWallet();

      if (network.providerConfig.nickname !== currentNetwork) {
        await WalletView.tapNetworksButtonOnNavBar();
        await Assertions.checkIfToggleIsOn(NetworkListModal.testNetToggle);
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
      await QuoteView.tapOnGetQuotes();
      await Assertions.checkIfVisible(SwapView.fetchingQuotes);
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

  it('should validate segment/metametric events for a successful swap', async () => {

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
    const events = await getEventsPayloads(mockServer, [
      EVENT_NAMES.SWAP_STARTED,
      EVENT_NAMES.SWAP_COMPLETED,
      EVENT_NAMES.SWAPS_OPENED,
      EVENT_NAMES.QUOTES_RECEIVED,
    ]);

    const softAssert = new SoftAssert();

    await softAssert.checkAndCollect(
      () => Assertions.checkIfArrayHasLength(events, 8),
      'Should have 8 events for 2 swaps',
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
        () =>
          Assertions.checkIfObjectContains(swapsOpenedEvents[i].properties, {
            action: 'Swap',
            name: 'Swaps',
            source: 'MainView',
            chain_id: '1',
          }),
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
        () =>
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
          }),
        `Quotes Received [${i}]: Check properties (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsPresent(
            quotesReceivedEvents[i].properties.response_time,
          ),
        `Quotes Received [${i}]: Check response_time (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsPresent(
            quotesReceivedEvents[i].properties.network_fees_USD,
          ),
        `Quotes Received [${i}]: Check network_fees_USD (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsPresent(
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
        () =>
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
          }),
        `Swap Started [${i}]: Check properties (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsPresent(
            quotesReceivedEvents[i].properties.network_fees_USD,
          ),
        `Swap Started [${i}]: Check network_fees_USD (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsPresent(
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
        () =>
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
          }),
        `Swap Completed [${i}]: Check properties (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsPresent(
            quotesReceivedEvents[i].properties.network_fees_USD,
          ),
        `Swap Completed [${i}]: Check network_fees_USD (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsPresent(
            quotesReceivedEvents[i].properties.network_fees_ETH,
          ),
        `Swap Completed [${i}]: Check network_fees_ETH (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsPresent(
            swapCompletedEvents[i].properties.time_to_mine,
          ),
        `Swap Completed [${i}]: Check time_to_mine (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsPresent(
            swapCompletedEvents[i].properties.estimated_vs_used_gasRatio,
          ),
        `Swap Completed [${i}]: Check estimated_vs_used_gasRatio (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );

      await softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsPresent(
            swapCompletedEvents[i].properties.quote_vs_executionRatio,
          ),
        `Swap Completed [${i}]: Check quote_vs_executionRatio (sourceToken: ${testCases[i]?.sourceTokenSymbol})`,
      );
    }

    softAssert.throwIfErrors();
  });
});
