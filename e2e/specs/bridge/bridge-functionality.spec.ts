'use strict';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import QuoteView from '../../pages/Bridge/QuoteView';
import FixtureBuilder from '../../fixtures/fixture-builder';
import FixtureServer from '../../fixtures/fixture-server';
import WalletView from '../../pages/wallet/WalletView';
import TestHelpers from '../../helpers';
import { SmokeTrade } from '../../tags';
import Assertions from '../../utils/Assertions';
import Ganache from '../../../app/util/test/ganache';
import AdvancedSettingsView from '../../pages/Settings/AdvancedView';
import SettingsView from '../../pages/Settings/SettingsView';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import AddNewHdAccountComponent from '../../pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet.js';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal.js';
import NetworkListModal from '../../pages/Network/NetworkListModal.js';
import { getFixturesServerPort, getMockServerPort } from '../../fixtures/utils';
import { startMockServer } from './bridge-mocks';
import { stopMockServer } from '../../api-mocking/mock-server';
import { localNodeOptions, testSpecificMock } from './constants';
import { Mockttp } from 'mockttp';

const fixtureServer = new FixtureServer();

describe.skip(SmokeTrade('Bridge functionality'), () => {
  const FIRST_ROW = 0;
  let mockServer: Mockttp;
  let localNode: Ganache;

  beforeAll(async () => {
    jest.setTimeout(120000);
    localNode = new Ganache();
    await localNode.start(localNodeOptions);
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().withGanacheNetwork('0x1').build();
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
    await Assertions.checkIfNotVisible(NetworkEducationModal.container as Promise<Detox.IndexableNativeElement>);
    await Assertions.checkIfVisible(WalletView.container);

    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.changeNetworkTo('Localhost', false);
    await Assertions.checkIfVisible(NetworkEducationModal.container);
    await NetworkEducationModal.tapGotItButton();
    await Assertions.checkIfNotVisible(NetworkEducationModal.container as Promise<Detox.IndexableNativeElement>);
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
    await QuoteView.selectToken('SOL');
    await Assertions.checkIfVisible(QuoteView.quotesLabel);
    await Assertions.checkIfVisible(QuoteView.continueButton);
    await QuoteView.tapContinue();

    // Check the bridge activity completed
    await TabBarComponent.tapActivity();
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(
      ActivitiesView.bridgeActivityTitle('Solana'),
    );
    await Assertions.checkIfElementToHaveText(
      ActivitiesView.transactionStatus(FIRST_ROW) as Promise<Detox.IndexableNativeElement>,
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      30000,
    );
  });

  it('should bridge ETH (Mainnet) to ETH (Base Network)', async () => {
    await Assertions.checkIfVisible(WalletView.container);

    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapBridgeButton();
    await device.disableSynchronization();
    await QuoteView.enterBridgeAmount('1');
    await QuoteView.tapBridgeTo();
    await TestHelpers.delay(1000);
    await QuoteView.selectNetwork('Base');
    await Assertions.checkIfVisible(QuoteView.token('ETH'));
    await QuoteView.selectToken('ETH');
    await Assertions.checkIfVisible(QuoteView.quotesLabel);
    await Assertions.checkIfVisible(QuoteView.continueButton);
    await QuoteView.tapContinue();

    // Check the bridge activity completed
    await TabBarComponent.tapActivity();
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.bridgeActivityTitle('Base'));
    await Assertions.checkIfElementToHaveText(
      ActivitiesView.transactionStatus(FIRST_ROW) as Promise<Detox.IndexableNativeElement>,
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      30000,
    );
  });

  it('should bridge ETH (Mainnet) to ETH (BNB Smart Chain Mainnet)', async () => {
    await Assertions.checkIfVisible(WalletView.container);
    await TabBarComponent.tapSettings();
    await SettingsView.tapAdvancedTitle();
    await AdvancedSettingsView.tapSmartTransactionSwitch();
    await TabBarComponent.tapWallet();

    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapBridgeButton();
    await device.disableSynchronization();
    await QuoteView.enterBridgeAmount('1');
    await QuoteView.tapBridgeTo();
    await TestHelpers.delay(1000);
    await QuoteView.selectNetwork('OP Mainnet');
    await Assertions.checkIfVisible(QuoteView.token('ETH'));
    await QuoteView.selectToken('ETH');
    await Assertions.checkIfVisible(QuoteView.quotesLabel);
    await Assertions.checkIfVisible(QuoteView.continueButton);
    await QuoteView.tapContinue();

    // Check the bridge activity completed
    await TabBarComponent.tapActivity();
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.bridgeActivityTitle('Optimism'));
    await Assertions.checkIfElementToHaveText(
      ActivitiesView.transactionStatus(FIRST_ROW) as Promise<Detox.IndexableNativeElement>,
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      30000,
    );
  });
});
