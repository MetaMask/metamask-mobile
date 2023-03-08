'use strict';
import WalletView from '../../pages/WalletView';
import DrawerView from '../../pages/Drawer/DrawerView';
import SendView from '../../pages/SendView';
import AmountView from '../../pages/AmountView';
import TransactionConfirmationView from '../../pages/TransactionConfirmView';
import {
  importWalletWithRecoveryPhrase,
  switchToGoreliNetwork,
} from '../../viewHelper';

const MULTISIG_ADDRESS = '0x0C1DD822d1Ddf78b0b702df7BF9fD0991D6255A1';

describe('Send to multisig address on iOS', () => {
  beforeEach(() => {
    jest.setTimeout(170000);
  });

  it('should import wallet and go to send view', async () => {
    await importWalletWithRecoveryPhrase();
    await switchToGoreliNetwork();
    // Check that we are on the wallet screen
    await WalletView.isVisible();
    // Open Drawer
    await WalletView.tapDrawerButton();

    await DrawerView.isVisible();
    await DrawerView.tapSendButton();

    await SendView.inputAddress(MULTISIG_ADDRESS);
    await SendView.tapNextButton();
    // Check that we are on the amount view
    await AmountView.isVisible();
  });

  it('should input amount', async () => {
    // Input acceptable value
    await AmountView.typeInTransactionAmount('0.00004');
    await AmountView.tapNextButton();

    // Check that we are on the confirm view
    await TransactionConfirmationView.isVisible();

    // Check that the amount is correct
    await TransactionConfirmationView.isTransactionTotalCorrect(
      '0.00004 GoerliETH',
    );
  });

  it('should send eth', async () => {
    // Tap on the send button
    await TransactionConfirmationView.tapConfirmButton();

    // Check that we are on the wallet screen
    await WalletView.isVisible();
  });
});
