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
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import { getFixturesServerPort, getMockServerPort } from '../../fixtures/utils';
import { startMockServer } from './bridge-mocks';
import { stopMockServer } from '../../api-mocking/mock-server';
import { localNodeOptions, testSpecificMock } from './costants';

const fixtureServer = new FixtureServer();

describe(SmokeTrade('Bridge from Actions'), () => {
  const FIRST_ROW = 0;
  let mockServer;
  let localNode;

  beforeAll(async () => {
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

  it('should bridge ETH (Mainnet) to ETH (Base Network)', async () => {
    await Assertions.checkIfVisible(WalletView.container);

    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapBridgeButton();
    await device.disableSynchronization();
    await QuoteView.enterBridgeAmount('1');
    await QuoteView.tapBridgeTo();
    await TestHelpers.delay(1000);
    await QuoteView.selectNetwork('Base');
    await QuoteView.typeSearchToken('ETH');
    await QuoteView.selectToken('ETH');
    await Assertions.checkIfVisible(QuoteView.expandQuoteDetails);
    await QuoteView.tapExpandDetails()
    await Assertions.checkIfVisible(QuoteView.quotesLabel);
    await Assertions.checkIfVisible(QuoteView.continueButton);
    await QuoteView.tapContinue();

    // Check the bridge activity completed
    await TabBarComponent.tapActivity();
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.brideActivityTitle('Base'));
    await Assertions.checkIfElementToHaveText(
      ActivitiesView.transactionStatus(FIRST_ROW),
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      30000,
    );
    //await device.enableSynchronization();
    //await TestHelpers.delay(3000);
  });

  it('should bridge ETH (Mainnet) to SOL (Solana)', async () => {
    await TabBarComponent.tapActions();
    await TestHelpers.delay(500);
    await WalletActionsBottomSheet.tapBridgeButton();
    await device.disableSynchronization();
    await TestHelpers.delay(1000);
    await QuoteView.enterBridgeAmount('1');
    await QuoteView.tapBridgeTo();
    await TestHelpers.delay(1000);
    await QuoteView.selectNetwork('Solana');
    await QuoteView.typeSearchToken('SOL');
    await QuoteView.selectToken('SOL');
    //await TestHelpers.delay(1000);
        await Assertions.checkIfVisible(QuoteView.expandQuoteDetails);
    await QuoteView.tapExpandDetails()
    await Assertions.checkIfVisible(QuoteView.quotesLabel);
    await Assertions.checkIfVisible(QuoteView.continueButton);
    await QuoteView.tapContinue();

    // Check the bridge activity completed
    await TabBarComponent.tapActivity();
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(
      ActivitiesView.brideActivityTitle('Solana'),
    );
    await Assertions.checkIfElementToHaveText(
      ActivitiesView.transactionStatus(FIRST_ROW),
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      30000,
    );
  });
});
