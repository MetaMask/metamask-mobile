'use strict';
import { Smoke } from '../tags';

import TestHelpers from '../helpers';

import WalletView from '../pages/WalletView';
import NetworkEducationModal from '../pages/modals/NetworkEducationModal';
import AddCustomTokenView from '../pages/AddCustomTokenView';
import SendView from '../pages/SendView';
import AmountView from '../pages/AmountView';
import { importWalletWithRecoveryPhrase } from '../viewHelper';
import TransactionConfirmationView from '../pages/TransactionConfirmView';
import NetworkListModal from '../pages/modals/NetworkListModal';
import TokenOverview from '../pages/TokenOverview';

const TOKEN_ADDRESS = '0x779877A7B0D9E8603169DdbD7836e478b4624789';
const SEND_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';

describe(Smoke('Send ERC Token'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });

  it('should add Sepolia testnet to my networks list', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await TestHelpers.delay(2000);
    await NetworkListModal.tapTestNetworkSwitch();
    await NetworkListModal.isTestNetworkToggleOn();

    await NetworkListModal.changeNetwork('Sepolia Test Network');
  });
  it('should dismiss network education modal', async () => {
    await NetworkEducationModal.isVisible();
    await NetworkEducationModal.tapGotItButton();
    await NetworkEducationModal.isNotVisible();
  });

  it('should Import custom token', async () => {
    await WalletView.tapImportTokensButton();
    await AddCustomTokenView.typeTokenAddress(TOKEN_ADDRESS);
    await TestHelpers.delay(1000);
    await AddCustomTokenView.tapTokenSymbolInputBox();
    await TestHelpers.delay(1000);
    await AddCustomTokenView.tapTokenSymbolText();
    await AddCustomTokenView.scrollDownOnImportCustomTokens();
    await AddCustomTokenView.tapImportButton();
    await WalletView.isVisible();
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
    await AmountView.typeInTransactionAmount('0.000001');
    await TestHelpers.delay(5000);

    await AmountView.tapNextButton();
    await TransactionConfirmationView.isAmountVisible('< 0.00001 LINK');
    await TransactionConfirmationView.tapConfirmButton();
    TestHelpers.checkIfElementWithTextIsNotVisible('Transaction submitted');
  });
});
