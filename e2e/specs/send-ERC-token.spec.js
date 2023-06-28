'use strict';
import { Smoke } from '../tags';

import TestHelpers from '../helpers';

import WalletView from '../pages/WalletView';
import SettingsView from '../pages/Drawer/Settings/SettingsView';
import NetworkView from '../pages/Drawer/Settings/NetworksView';
import NetworkEducationModal from '../pages/modals/NetworkEducationModal';
import AddCustomTokenView from '../pages/AddCustomTokenView';
import SendView from '../pages/SendView';
import AmountView from '../pages/AmountView';
import { importWalletWithRecoveryPhrase } from '../viewHelper';
import TransactionConfirmationView from '../pages/TransactionConfirmView';
import TabBarComponent from '../pages/TabBarComponent';

const AVAX_URL = 'https://api.avax-test.network/ext/C/rpc';
const TOKEN_ADDRESS = '0x5425890298aed601595a70AB815c96711a31Bc65';
const SEND_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';

describe(Smoke('Send ERC Token'), () => {
  beforeAll(async () => {
    await importWalletWithRecoveryPhrase();
  });

  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should add AVAX testnet to my networks list', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapNetworks();
    await NetworkView.isNetworkViewVisible();

    await TestHelpers.delay(3000);
    await NetworkView.tapAddNetworkButton();
    await NetworkView.switchToCustomNetworks();

    await NetworkView.typeInNetworkName('AVAX Fuji');
    await NetworkView.clearRpcInputBox();
    await NetworkView.typeInRpcUrl(AVAX_URL);
    await NetworkView.typeInChainId('43113');
    await NetworkView.typeInNetworkSymbol('AVAX\n');

    await NetworkView.swipeToRPCTitleAndDismissKeyboard(); // Focus outside of text input field
    await NetworkView.tapRpcNetworkAddButton();

    await WalletView.isVisible();
    await WalletView.isNetworkNameVisible('AVAX Fuji');
    await NetworkEducationModal.tapGotItButton();
  });

  it('should Import custom AVAX token ', async () => {
    await WalletView.isVisible();
    await WalletView.tapImportTokensButton();
    await AddCustomTokenView.typeTokenAddress(TOKEN_ADDRESS);
    await TestHelpers.delay(1000);
    await AddCustomTokenView.tapTokenSymbolInputBox();
    await TestHelpers.delay(1000);
    await AddCustomTokenView.tapTokenSymbolText();
    await TestHelpers.swipeByText('Token Decimal', 'up', 'slow', 0.1);
    await TestHelpers.delay(1000);
    await TestHelpers.swipeByText('Token Decimal', 'up', 'slow', 0.1);
    await AddCustomTokenView.tapImportButton();
  });

  it('should send token to address via Token Overview screen', async () => {
    await WalletView.tapOnToken('AVAX'); // tapping burger menu
    await WalletView.tapSendIcon();
    await SendView.inputAddress(SEND_ADDRESS);
    await TestHelpers.delay(1000);
    await SendView.tapNextButton();
    await AmountView.typeInTransactionAmount('0.000001');
    await AmountView.tapNextButton();
    await TransactionConfirmationView.isAmountVisible('< 0.00001 AVAX');
    await TransactionConfirmationView.tapConfirmButton();
    TestHelpers.checkIfElementWithTextIsNotVisible('Transaction submitted');
  });
});
