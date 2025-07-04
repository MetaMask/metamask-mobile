
'use strict';
import { loginToApp } from '../../viewHelper.js';
import TabBarComponent from '../../pages/wallet/TabBarComponent.js';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper.js';
import QuoteView from '../../pages/Bridge/QuoteView.js';
import FixtureBuilder from '../../fixtures/fixture-builder.js';
import FixtureServer from '../../fixtures/fixture-server.js';
import WalletView from '../../pages/wallet/WalletView.js';
import TestHelpers from '../../helpers.js';
import { SmokeTrade } from '../../tags.js';
import Assertions from '../../utils/Assertions.js';
import Ganache from '../../../app/util/test/ganache.js';
import AdvancedSettingsView from '../../pages/Settings/AdvancedView.js';
import SettingsView from '../../pages/Settings/SettingsView.js';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet.js';
import ActivitiesView from '../../pages/Transactions/ActivitiesView.js';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors.js';
import AddNewHdAccountComponent from '../../pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent.js';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet.js';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet.js';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal.js';
import NetworkListModal from '../../pages/Network/NetworkListModal.js';
import { getFixturesServerPort, getMockServerPort } from '../../fixtures/utils.js';
import { startMockServer } from '../bridge/bridge-mocks.js';
import { stopMockServer } from '../../api-mocking/mock-server.js';
import { localNodeOptions, testSpecificMock } from '../bridge/constants.js';
import { Mockttp, MockttpServer } from 'mockttp';
import { getEventsPayloads } from '../analytics/helpers.js';
import SoftAssert from '../../utils/SoftAssert.js';

const fixtureServer = new FixtureServer();

enum eventsToCheck {
  BRIDGE_BUTTON_CLICKED = 'Bridge Button Clicked',
  BRIDGE_PAGE_VIEWED = 'Bridge Page Viewed',
  UNIFIED_SWAPBRIDGE_INPUT_CHANGED = 'Unified SwapBridge Input Changed',
  UNIFIED_SWAPBRIDGE_QUOTES_REQUESTED = 'Unified SwapBridge Quotes Requested',
  UNIFIED_SWAPBRIDGE_SUBMITTED = 'Unified SwapBridge Submitted',
  UNIFIED_SWAPBRIDGE_COMPLETED = 'Unified SwapBridge Completed',
}

describe(SmokeTrade('Bridge functionality'), () => {
  const FIRST_ROW = 0;
  let mockServer: Mockttp;
  let localNode: Ganache;
  let eventsToAssert: { event: string, properties: Record<string, unknown> }[] = [];

  beforeAll(async () => {
    jest.setTimeout(120000);
    localNode = new Ganache();
    await localNode.start(localNodeOptions);
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withGanacheNetwork('0x1')
      .withMetaMetricsOptIn()
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    const mockServerPort = getMockServerPort();
    mockServer = await startMockServer(testSpecificMock, mockServerPort);
    await TestHelpers.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: {
        fixtureServerPort: `${getFixturesServerPort()}`,
        mockServerPort: `${mockServerPort}`,
      },
    });

    await TestHelpers.delay(5000);
    await loginToApp();
  });

  afterAll(async () => {
    if (mockServer) await stopMockServer(mockServer);
    await stopFixtureServer(fixtureServer);
    if (localNode) await localNode.quit();
  });

  it('should bridge ETH (Mainnet) to SOL (Solana)', async () => {
    await TabBarComponent.tapWallet();
    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapAddSolanaAccount();
    await AddNewHdAccountComponent.tapConfirm();
    await Assertions.checkIfVisible(NetworkEducationModal.container);
    await NetworkEducationModal.tapGotItButton();
    await Assertions.checkIfNotVisible(
      NetworkEducationModal.container as DetoxElement,
    );
    await Assertions.checkIfVisible(WalletView.container);

    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.changeNetworkTo('Localhost', false);
    await Assertions.checkIfVisible(NetworkEducationModal.container);
    await NetworkEducationModal.tapGotItButton();
    await Assertions.checkIfNotVisible(
      NetworkEducationModal.container as DetoxElement,
    );
    await Assertions.checkIfVisible(WalletView.container);
    await TabBarComponent.tapActions();
    await TestHelpers.delay(500);
    await WalletActionsBottomSheet.tapBridgeButton();
    await device.disableSynchronization();
    await QuoteView.enterBridgeAmount('1');
    await QuoteView.tapBridgeTo();
    await TestHelpers.delay(1000);
    await QuoteView.selectNetwork('Solana');
    await Assertions.checkIfVisible(QuoteView.token('SOL'));
    await TestHelpers.delay(1000);
    await QuoteView.selectToken('SOL');
    await Assertions.checkIfVisible(QuoteView.networkFeeLabel, 60000);
    await Assertions.checkIfVisible(QuoteView.confirmButton);
    await QuoteView.tapConfirm();
    await TestHelpers.delay(1000);
    // Check the bridge activity completed
    await TabBarComponent.tapActivity();
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(
      ActivitiesView.bridgeActivityTitle('Solana'),
    );
    await Assertions.checkIfElementToHaveText(
      ActivitiesView.transactionStatus(
        FIRST_ROW,
      ) as Promise<IndexableNativeElement>,
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      30000,
    );

    // Gather the events from this test to assert later in another test
    eventsToAssert = await getEventsPayloads(mockServer as MockttpServer, [
      eventsToCheck.BRIDGE_BUTTON_CLICKED,
      eventsToCheck.BRIDGE_PAGE_VIEWED,
      eventsToCheck.UNIFIED_SWAPBRIDGE_INPUT_CHANGED,
      eventsToCheck.UNIFIED_SWAPBRIDGE_QUOTES_REQUESTED,
      eventsToCheck.UNIFIED_SWAPBRIDGE_SUBMITTED,
      eventsToCheck.UNIFIED_SWAPBRIDGE_COMPLETED,
    ]);
  });

  it('should check the Segment events from one bridge', async () => {
    const softAssert = new SoftAssert();
    await softAssert.checkAndCollect(
      () => Assertions.checkIfArrayHasLength(eventsToAssert, 9),
      'Should have 9 events',
    );

    // Bridge Button Clicked
    const bridgeButtonClicked = eventsToAssert.find((event) => event.event === eventsToCheck.BRIDGE_BUTTON_CLICKED);
    await softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(bridgeButtonClicked);
      }, 'Bridge Button Clicked: Should be defined',
    );
    await softAssert.checkAndCollect(
      async () => Assertions.checkIfObjectContains(bridgeButtonClicked?.properties as Record<string, unknown>, {
        chain_id_source: '1',
        token_address_source: '0x0000000000000000000000000000000000000000',
        token_symbol_source: 'ETH',
      }),
      'Bridge Button Clicked: Should have the correct properties',
    );

    // Bridge Page Viewed
    const bridgePageViewed = eventsToAssert.find((event) => event.event === eventsToCheck.BRIDGE_PAGE_VIEWED);
    await softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(bridgePageViewed);
      }, 'Bridge Page Viewed: Should be defined',
    );
    await softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfObjectContains(bridgePageViewed?.properties as Record<string, unknown>, {
          chain_id_source: '1',
          token_address_source: '0x0000000000000000000000000000000000000000',
          token_symbol_source: 'ETH',
        });
      }, 'Bridge Page Viewed: Should have the correct properties',
    );

    // Unified Swap Bridge Input Changed
    const inputTypes = [
      'token_destination',
      'chain_source',
      'chain_destination',
      'slippage',
    ];
    const unifiedSwapBridgeInputChanged = eventsToAssert.filter((event) => event.event === eventsToCheck.UNIFIED_SWAPBRIDGE_INPUT_CHANGED);
    await softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(unifiedSwapBridgeInputChanged);
      }, 'Unified SwapBridge Input Changed: Should be defined',
    );
    await softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfArrayHasLength(unifiedSwapBridgeInputChanged, 4);
      }, 'Unified SwapBridge Input Changed: Should have 4 events',
    );
    const hasAllInputs = inputTypes.every((inputType) =>
      unifiedSwapBridgeInputChanged.some(
        (event) =>
          event.event === eventsToCheck.UNIFIED_SWAPBRIDGE_INPUT_CHANGED &&
          event.properties.input === inputType,
      ),
    );
    await softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(hasAllInputs);
      }, 'Unified SwapBridge Input Changed: Should have all inputs',
    );

    // Unified Swap Bridge Quotes Requested
    const unifiedSwapBridgeQuotesRequested = eventsToAssert.find((event) => event.event === eventsToCheck.UNIFIED_SWAPBRIDGE_QUOTES_REQUESTED);
    await softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(unifiedSwapBridgeQuotesRequested);
      }, 'Unified SwapBridge Quotes Requested: Should be defined',
    );
    await softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfObjectContains(unifiedSwapBridgeQuotesRequested?.properties as Record<string, unknown>, {
          chain_id_source: 'eip155:1',
          chain_id_destination: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          token_address_source: 'eip155:1/slip44:60',
          token_address_destination: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          token_symbol_source: 'ETH',
          token_symbol_destination: 'SOL',
        });
      }, 'Unified SwapBridge Quotes Requested: Should have the correct properties',
    );
    await softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(unifiedSwapBridgeQuotesRequested?.properties.slippage_limit);
      }, 'Unified SwapBridge Quotes Requested: Should have a slippage',
    );

    // Unified Swap Bridge Submitted
    const unifiedSwapBridgeSubmitted = eventsToAssert.find((event) => event.event === eventsToCheck.UNIFIED_SWAPBRIDGE_SUBMITTED);
    await softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(unifiedSwapBridgeSubmitted);
      }, 'Unified SwapBridge Submitted: Should be defined',
    );
    await softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfObjectContains(unifiedSwapBridgeSubmitted?.properties as Record<string, unknown>, {
          chain_id_source: 'eip155:1',
          chain_id_destination: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          token_address_source: 'eip155:1/slip44:60',
          token_address_destination: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          token_symbol_source: 'ETH',
          token_symbol_destination: 'SOL',
        });
      }, 'Unified SwapBridge Submitted: Should have the correct properties',
    );

    // Unified Swap Bridge Completed
    const unifiedSwapBridgeCompleted = eventsToAssert.find((event) => event.event === eventsToCheck.UNIFIED_SWAPBRIDGE_COMPLETED);
    await softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(unifiedSwapBridgeCompleted);
      }, 'Unified SwapBridge Completed: Should be defined',
    );
    await softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfObjectContains(unifiedSwapBridgeCompleted?.properties as Record<string, unknown>, {
          chain_id_source: 'eip155:1',
          chain_id_destination: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          token_address_source: 'eip155:1/slip44:60',
          token_address_destination: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          token_symbol_source: 'ETH',
          token_symbol_destination: 'SOL',
        });
      }, 'Unified SwapBridge Completed: Should have the correct properties',
    );

    await softAssert.throwIfErrors();
  });

  it('should bridge ETH (Mainnet) to ETH (Base Network)', async () => {
    await TabBarComponent.tapWallet();
    await Assertions.checkIfVisible(WalletView.container);
    await TabBarComponent.tapActions();
    await TestHelpers.delay(500);
    await WalletActionsBottomSheet.tapBridgeButton();
    await TestHelpers.delay(1000);
    await QuoteView.enterBridgeAmount('1');
    await TestHelpers.delay(500);
    await QuoteView.tapBridgeTo();
    await TestHelpers.delay(1000);
    await QuoteView.selectNetwork('Base');
    await Assertions.checkIfVisible(QuoteView.token('ETH'));
    await QuoteView.selectToken('ETH');
    await Assertions.checkIfVisible(QuoteView.networkFeeLabel, 60000);
    await Assertions.checkIfVisible(QuoteView.confirmButton);
    await QuoteView.tapConfirm();
    await TestHelpers.delay(1000);

    // Check the bridge activity completed
    await TabBarComponent.tapActivity();
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.bridgeActivityTitle('Base'));
    await Assertions.checkIfElementToHaveText(
      ActivitiesView.transactionStatus(
        FIRST_ROW,
      ) as Promise<IndexableNativeElement>,
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      30000,
    );
  });

  it('should bridge ETH (Mainnet) to ETH (BNB Smart Chain Mainnet)', async () => {
    await TabBarComponent.tapWallet();
    await Assertions.checkIfVisible(WalletView.container);

    await TabBarComponent.tapSettings();
    await SettingsView.tapAdvancedTitle();
    await TestHelpers.delay(500);

    await AdvancedSettingsView.tapSmartTransactionSwitch();
    await TabBarComponent.tapWallet();

    await TabBarComponent.tapActions();
    await TestHelpers.delay(500);
    await WalletActionsBottomSheet.tapBridgeButton();
    await TestHelpers.delay(1000);
    await QuoteView.enterBridgeAmount('1');
    await QuoteView.tapBridgeTo();
    await TestHelpers.delay(1000);
    await QuoteView.selectNetwork('OP Mainnet');
    await Assertions.checkIfVisible(QuoteView.token('ETH'));
    await QuoteView.selectToken('ETH');
    await Assertions.checkIfVisible(QuoteView.networkFeeLabel, 60000);
    await Assertions.checkIfVisible(QuoteView.confirmButton);
    await QuoteView.tapConfirm();
    await TestHelpers.delay(1000);

    // Check the bridge activity completed
    await TabBarComponent.tapActivity();
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(
      ActivitiesView.bridgeActivityTitle('Optimism'),
    );
    await Assertions.checkIfElementToHaveText(
      ActivitiesView.transactionStatus(
        FIRST_ROW,
      ) as Promise<IndexableNativeElement>,
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      30000,
    );
  });
});
