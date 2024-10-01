'use strict';
import { SmokeCore } from '../../tags';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import TokenOverview from '../../pages/TokenOverview';
import ConfirmAddAssetView from '../../pages/wallet/ImportTokenFlow/ConfirmAddAsset';
import ImportTokensView from '../../pages/wallet/ImportTokenFlow/ImportTokensView';
import Assertions from '../../utils/Assertions';
import { CustomNetworks } from '../../resources/networks.e2e';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';

const TOKEN_ADDRESS = '0x514910771AF9Ca656af840dff83E8264EcF986CA';
const SEND_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';

const fixtureServer = new FixtureServer();

describe(SmokeCore('Send ERC Token'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(CustomNetworks.Tenderly)
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should Import custom token', async () => {
    await WalletView.tapImportTokensButton();
    await ImportTokensView.switchToCustomTab();
    await ImportTokensView.typeTokenAddress(TOKEN_ADDRESS);
    await ImportTokensView.tapSymbolInput();
    await ImportTokensView.tapTokenSymbolText();
    await ImportTokensView.scrollDownOnImportCustomTokens();
    await ImportTokensView.tapOnNextButton();
    await Assertions.checkIfVisible(ConfirmAddAssetView.container);
    await ConfirmAddAssetView.tapOnConfirmButton();
    await Assertions.checkIfVisible(WalletView.container);
  });

  it('should send token to address via asset overview screen', async () => {
    await WalletView.tapOnToken('ChainLink Token');
    await TestHelpers.delay(3500);
    await TokenOverview.scrollOnScreen();
    await TestHelpers.delay(3500);
    await TokenOverview.tapSendButton();
    await SendView.inputAddress(SEND_ADDRESS);
    await TestHelpers.delay(1000);
    await SendView.tapNextButton();
    await AmountView.typeInTransactionAmount('0.001');
    await TestHelpers.delay(5000);
    await AmountView.tapNextButton();
    await Assertions.checkIfTextIsDisplayed('< 0.001 LINK');
    await TransactionConfirmationView.tapConfirmButton();
  });
});
