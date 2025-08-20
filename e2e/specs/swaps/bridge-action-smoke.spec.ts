import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../framework/fixtures/FixtureHelper';
import QuoteView from '../../pages/swaps/QuoteView';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import FixtureServer from '../../framework/fixtures/FixtureServer';
import WalletView from '../../pages/wallet/WalletView';
import TestHelpers from '../../helpers';
import { SmokeTrade } from '../../tags';
import Assertions from '../../framework/Assertions';
import Ganache from '../../../app/util/test/ganache';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import AddNewHdAccountComponent from '../../pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import {
  getFixturesServerPort,
  getMockServerPort,
} from '../../framework/fixtures/FixtureUtils';
import { startSwapsMockServer } from './helpers/swap-mocks';
import { stopMockServer } from '../../api-mocking/mock-server';
import { prepareSwapsTestEnvironment } from './helpers/prepareSwapsTestEnvironment';
import { bridgeSpecificMock, localNodeOptions } from './helpers/constants';
import { Mockttp, MockttpServer } from 'mockttp';
import { getEventsPayloads } from '../analytics/helpers';
import SoftAssert from '../../utils/SoftAssert';

const fixtureServer = new FixtureServer();

enum eventsToCheck {
  BRIDGE_BUTTON_CLICKED = 'Bridge Button Clicked',
  BRIDGE_PAGE_VIEWED = 'Bridge Page Viewed',
  UNIFIED_SWAPBRIDGE_INPUT_CHANGED = 'Unified SwapBridge Input Changed',
  UNIFIED_SWAPBRIDGE_QUOTES_REQUESTED = 'Unified SwapBridge Quotes Requested',
  UNIFIED_SWAPBRIDGE_SUBMITTED = 'Unified SwapBridge Submitted',
  UNIFIED_SWAPBRIDGE_COMPLETED = 'Unified SwapBridge Completed',
}

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe(SmokeTrade('Bridge functionality'), () => {
  const FIRST_ROW = 0;
  let mockServer: Mockttp;
  let localNode: Ganache;
  let eventsToAssert: { event: string; properties: Record<string, unknown> }[] =
    [];

  beforeAll(async () => {
    jest.setTimeout(120000);
    localNode = new Ganache();
    await localNode.start(localNodeOptions);
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withGanacheNetwork('0x1')
      .withDisabledSmartTransactions()
      .withMetaMetricsOptIn()
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    const mockServerPort = getMockServerPort();
    mockServer = await startSwapsMockServer(bridgeSpecificMock, mockServerPort);
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
    const destChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

    await TabBarComponent.tapWallet();
    await WalletView.tapIdenticon();
    await Assertions.expectElementToBeVisible(
      AccountListBottomSheet.accountList,
    );
    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapAddSolanaAccount();
    await AddNewHdAccountComponent.tapConfirm();
    await NetworkEducationModal.tapGotItButton();
    await Assertions.expectElementToBeVisible(WalletView.container);

    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.changeNetworkTo('Localhost', false);
    await NetworkEducationModal.tapGotItButton();
    await Assertions.expectElementToBeVisible(WalletView.container);
    await prepareSwapsTestEnvironment();

    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapSwapButton();
    await device.disableSynchronization();
    await QuoteView.tapDestinationToken();
    await QuoteView.selectNetwork('Solana');
    await QuoteView.tapToken(destChainId, 'SOL');
    await QuoteView.enterAmount('1');
    await Assertions.expectElementToBeVisible(QuoteView.networkFeeLabel);
    await Assertions.expectElementToBeVisible(QuoteView.confirmBridge);
    await QuoteView.tapConfirmBridge();

    // Gather the events from this test to assert later in another test
    eventsToAssert = await getEventsPayloads(mockServer as MockttpServer, [
      eventsToCheck.BRIDGE_BUTTON_CLICKED,
      eventsToCheck.BRIDGE_PAGE_VIEWED,
      eventsToCheck.UNIFIED_SWAPBRIDGE_INPUT_CHANGED,
      eventsToCheck.UNIFIED_SWAPBRIDGE_QUOTES_REQUESTED,
      eventsToCheck.UNIFIED_SWAPBRIDGE_SUBMITTED,
      eventsToCheck.UNIFIED_SWAPBRIDGE_COMPLETED,
    ]);

    // Check the bridge activity completed
    await Assertions.expectElementToBeVisible(ActivitiesView.title);
    await Assertions.expectElementToBeVisible(
      ActivitiesView.bridgeActivityTitle('Solana'),
    );
    return; //BUGBUG
    await Assertions.expectElementToHaveText(
      ActivitiesView.transactionStatus(
        FIRST_ROW,
      ) as Promise<IndexableNativeElement>,
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      { timeout: 30000 },
    );
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('should check the Segment events from one bridge', async () => {
    const softAssert = new SoftAssert();

    // Define all assertion calls as variables
    const checkEventCount = softAssert.checkAndCollect(
      () => Assertions.checkIfArrayHasLength(eventsToAssert, 9),
      'Should have 9 events',
    );

    // Bridge Button Clicked
    const bridgeButtonClicked = eventsToAssert.find(
      (event) => event.event === eventsToCheck.BRIDGE_BUTTON_CLICKED,
    );

    const checkBridgeButtonClickedDefined = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(bridgeButtonClicked);
      },
      'Bridge Button Clicked: Should be defined',
    );

    const checkBridgeButtonClickedProperties = softAssert.checkAndCollect(
      async () =>
        Assertions.checkIfObjectContains(
          bridgeButtonClicked?.properties as Record<string, unknown>,
          {
            chain_id_source: '1',
            token_address_source: '0x0000000000000000000000000000000000000000',
            token_symbol_source: 'ETH',
          },
        ),
      'Bridge Button Clicked: Should have the correct properties',
    );

    // Bridge Page Viewed
    const bridgePageViewed = eventsToAssert.find(
      (event) => event.event === eventsToCheck.BRIDGE_PAGE_VIEWED,
    );

    const checkBridgePageViewedDefined = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(bridgePageViewed);
      },
      'Bridge Page Viewed: Should be defined',
    );

    const checkBridgePageViewedProperties = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfObjectContains(
          bridgePageViewed?.properties as Record<string, unknown>,
          {
            chain_id_source: '1',
            token_address_source: '0x0000000000000000000000000000000000000000',
            token_symbol_source: 'ETH',
          },
        );
      },
      'Bridge Page Viewed: Should have the correct properties',
    );

    // Unified Swap Bridge Input Changed
    const inputTypes = [
      'token_destination',
      'chain_source',
      'chain_destination',
      'slippage',
    ];
    const unifiedSwapBridgeInputChanged = eventsToAssert.filter(
      (event) => event.event === eventsToCheck.UNIFIED_SWAPBRIDGE_INPUT_CHANGED,
    );

    const checkUnifiedSwapBridgeInputChangedDefined =
      softAssert.checkAndCollect(async () => {
        await Assertions.checkIfValueIsDefined(unifiedSwapBridgeInputChanged);
      }, 'Unified SwapBridge Input Changed: Should be defined');

    const checkUnifiedSwapBridgeInputChangedLength = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfArrayHasLength(
          unifiedSwapBridgeInputChanged,
          4,
        );
      },
      'Unified SwapBridge Input Changed: Should have 4 events',
    );

    const hasAllInputs = inputTypes.every((inputType) =>
      unifiedSwapBridgeInputChanged.some(
        (event) =>
          event.event === eventsToCheck.UNIFIED_SWAPBRIDGE_INPUT_CHANGED &&
          event.properties.input === inputType,
      ),
    );

    const checkUnifiedSwapBridgeInputChangedAllInputs =
      softAssert.checkAndCollect(async () => {
        await Assertions.checkIfValueIsDefined(hasAllInputs);
      }, 'Unified SwapBridge Input Changed: Should have all inputs');

    // Unified Swap Bridge Quotes Requested
    const unifiedSwapBridgeQuotesRequested = eventsToAssert.find(
      (event) =>
        event.event === eventsToCheck.UNIFIED_SWAPBRIDGE_QUOTES_REQUESTED,
    );

    const checkUnifiedSwapBridgeQuotesRequestedDefined =
      softAssert.checkAndCollect(async () => {
        await Assertions.checkIfValueIsDefined(
          unifiedSwapBridgeQuotesRequested,
        );
      }, 'Unified SwapBridge Quotes Requested: Should be defined');

    const checkUnifiedSwapBridgeQuotesRequestedProperties =
      softAssert.checkAndCollect(async () => {
        await Assertions.checkIfObjectContains(
          unifiedSwapBridgeQuotesRequested?.properties as Record<
            string,
            unknown
          >,
          {
            chain_id_source: 'eip155:1',
            chain_id_destination: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            token_address_source: 'eip155:1/slip44:60',
            token_address_destination:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
            token_symbol_source: 'ETH',
            token_symbol_destination: 'SOL',
          },
        );
      }, 'Unified SwapBridge Quotes Requested: Should have the correct properties');

    const checkUnifiedSwapBridgeQuotesRequestedSlippage =
      softAssert.checkAndCollect(async () => {
        await Assertions.checkIfValueIsDefined(
          unifiedSwapBridgeQuotesRequested?.properties.slippage_limit,
        );
      }, 'Unified SwapBridge Quotes Requested: Should have a slippage');

    // Unified Swap Bridge Submitted
    const unifiedSwapBridgeSubmitted = eventsToAssert.find(
      (event) => event.event === eventsToCheck.UNIFIED_SWAPBRIDGE_SUBMITTED,
    );

    const checkUnifiedSwapBridgeSubmittedDefined = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(unifiedSwapBridgeSubmitted);
      },
      'Unified SwapBridge Submitted: Should be defined',
    );

    const checkUnifiedSwapBridgeSubmittedProperties =
      softAssert.checkAndCollect(async () => {
        await Assertions.checkIfObjectContains(
          unifiedSwapBridgeSubmitted?.properties as Record<string, unknown>,
          {
            chain_id_source: 'eip155:1',
            chain_id_destination: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            token_address_source: 'eip155:1/slip44:60',
            token_address_destination:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
            token_symbol_source: 'ETH',
            token_symbol_destination: 'SOL',
          },
        );
      }, 'Unified SwapBridge Submitted: Should have the correct properties');

    // Unified Swap Bridge Completed
    const unifiedSwapBridgeCompleted = eventsToAssert.find(
      (event) => event.event === eventsToCheck.UNIFIED_SWAPBRIDGE_COMPLETED,
    );

    const checkUnifiedSwapBridgeCompletedDefined = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(unifiedSwapBridgeCompleted);
      },
      'Unified SwapBridge Completed: Should be defined',
    );

    const checkUnifiedSwapBridgeCompletedProperties =
      softAssert.checkAndCollect(async () => {
        await Assertions.checkIfObjectContains(
          unifiedSwapBridgeCompleted?.properties as Record<string, unknown>,
          {
            chain_id_source: 'eip155:1',
            chain_id_destination: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            token_address_source: 'eip155:1/slip44:60',
            token_address_destination:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
            token_symbol_source: 'ETH',
            token_symbol_destination: 'SOL',
          },
        );
      }, 'Unified SwapBridge Completed: Should have the correct properties');

    await Promise.all([
      checkEventCount,
      checkBridgeButtonClickedDefined,
      checkBridgeButtonClickedProperties,
      checkBridgePageViewedDefined,
      checkBridgePageViewedProperties,
      checkUnifiedSwapBridgeInputChangedDefined,
      checkUnifiedSwapBridgeInputChangedLength,
      checkUnifiedSwapBridgeInputChangedAllInputs,
      checkUnifiedSwapBridgeQuotesRequestedDefined,
      checkUnifiedSwapBridgeQuotesRequestedProperties,
      checkUnifiedSwapBridgeQuotesRequestedSlippage,
      checkUnifiedSwapBridgeSubmittedDefined,
      checkUnifiedSwapBridgeSubmittedProperties,
      checkUnifiedSwapBridgeCompletedDefined,
      checkUnifiedSwapBridgeCompletedProperties,
    ]);

    softAssert.throwIfErrors();
  });

  it('should bridge ETH (Mainnet) to ETH (Base Network)', async () => {
    const destChainId = '0x2105';

    await TabBarComponent.tapWallet();
    await WalletView.tapWalletSwapButton();
    await device.disableSynchronization();
    await QuoteView.tapDestinationToken();
    await TestHelpers.delay(2000); // wait until tokens are displayed
    await QuoteView.swipeNetwork('Base', 0.3);
    await TestHelpers.delay(2000); // allow scroll to take place
    await QuoteView.selectNetwork('Base');
    await QuoteView.tapToken(destChainId, 'ETH');
    await QuoteView.enterAmount('1');
    await Assertions.expectElementToBeVisible(QuoteView.networkFeeLabel, {
      timeout: 60000,
    });
    await Assertions.expectElementToBeVisible(QuoteView.confirmBridge);

    await QuoteView.tapConfirmBridge();

    // Check the bridge activity completed
    await Assertions.expectElementToBeVisible(ActivitiesView.title);
    await Assertions.expectElementToBeVisible(
      ActivitiesView.bridgeActivityTitle('Base'),
    );
    return; //BUGBUG
    await Assertions.expectElementToHaveText(
      ActivitiesView.transactionStatus(
        FIRST_ROW,
      ) as Promise<IndexableNativeElement>,
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      { timeout: 30000 },
    );
  });

  it('should bridge ETH (Mainnet) to ETH (Optimism)', async () => {
    const destChainId = '0xa';

    await TabBarComponent.tapWallet();
    await WalletView.tapWalletSwapButton();
    await device.disableSynchronization();
    await QuoteView.tapDestinationToken();
    await TestHelpers.delay(2000); // wait until tokens are displayed
    await QuoteView.swipeNetwork('Base', 0.85);
    await TestHelpers.delay(2000); // allow scroll to take place
    await QuoteView.selectNetwork('OP Mainnet');
    await QuoteView.tapToken(destChainId, 'ETH');
    await QuoteView.enterAmount('1');
    await Assertions.expectElementToBeVisible(QuoteView.networkFeeLabel);
    await Assertions.expectElementToBeVisible(QuoteView.confirmBridge);
    await QuoteView.tapConfirmBridge();

    // Check the bridge activity completed
    await Assertions.expectElementToBeVisible(ActivitiesView.title);
    await Assertions.expectElementToBeVisible(
      ActivitiesView.bridgeActivityTitle('Optimism'),
    );

    return; //BUGBUG
    await Assertions.expectElementToHaveText(
      ActivitiesView.transactionStatus(
        FIRST_ROW,
      ) as Promise<IndexableNativeElement>,
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      { timeout: 30000 },
    );
  });
});
