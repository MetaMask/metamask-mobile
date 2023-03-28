'use strict';

import AmountView from '../../pages/AmountView';
import DrawerView from '../../pages/Drawer/DrawerView';
import SendView from '../../pages/SendView';
import TransactionConfirmationView from '../../pages/TransactionConfirmView';
import WalletView from '../../pages/WalletView';
import {
  importWalletWithRecoveryPhrase,
  switchToGoreliNetwork,
} from '../../viewHelper';

const MYTH_ADDRESS = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';

describe('Send ETH Tests', () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should go to send view', async () => {
    await importWalletWithRecoveryPhrase();
    await switchToGoreliNetwork();
    // Open Drawer
    await WalletView.tapDrawerButton();
    await DrawerView.isVisible();
    await DrawerView.tapSendButton();
    // Make sure view with my accounts visible
    await SendView.isTransferBetweenMyAccountsButtonVisible();
  });

  it('should input a valid address to send to', async () => {
    await SendView.inputAddress(MYTH_ADDRESS);
    await SendView.noEthWarningMessageIsVisible();
    await SendView.tapNextButton();
    // Check that we are on the amount view
    await AmountView.isVisible();
  });

  it('should switch currency from crypto to fiat and back to crypto', async () => {
    await AmountView.typeInTransactionAmount('0.004');
    await AmountView.tapCurrencySwitch();
    await AmountView.isTransactionAmountConversionValueCorrect(
      '0.004 GoerliETH',
    );
    await AmountView.tapCurrencySwitch();
    await AmountView.isTransactionAmountCorrect('0.004');
  });

  it('should input and validate amount', async () => {
    // Input acceptable value
    await AmountView.typeInTransactionAmount('.00001');
    await AmountView.tapNextButton();

    // Check that we are on the confirm view
    await TransactionConfirmationView.isVisible();
  });

  it('should send ETH to Account 2', async () => {
    // Check that the amount is correct
    await TransactionConfirmationView.isTransactionTotalCorrect('0 GoerliETH');
    // Tap on the Send CTA
    await TransactionConfirmationView.tapConfirmButton();
    // Check that we are on the wallet screen
    await WalletView.isVisible();
  });
});
