'use strict';
import { Smoke } from '../../tags';

import WalletView from '../../pages/WalletView';
import SendView from '../../pages/SendView';
import AmountView from '../../pages/AmountView';
import TransactionConfirmationView from '../../pages/TransactionConfirmView';
import {
  importWalletWithRecoveryPhrase,
  switchToGoreliNetwork,
} from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';

const VALID_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';

describe(Smoke('Advanced Gas Fees and Priority Tests'), () => {
  beforeEach(() => {
    jest.setTimeout(170000);
  });

  it('should import wallet and go to send view', async () => {
    await importWalletWithRecoveryPhrase();
    await switchToGoreliNetwork();
    // Check that we are on the wallet screen
    await WalletView.isVisible();
    //Tap send Icon
    await TabBarComponent.tapActions();
    await WalletActionsModal.tapSendButton();

    await SendView.inputAddress(VALID_ADDRESS);
    await SendView.tapNextButton();
    // Check that we are on the amount view
    await AmountView.isVisible();
  });

  it('should edit priority gas settings', async () => {
    // Input acceptable value
    await AmountView.typeInTransactionAmount('0.00004');
    await AmountView.tapNextButton();

    // Check that we are on the confirm view
    await TransactionConfirmationView.isVisible();

    // Check that the amount is correct
    await TransactionConfirmationView.isTransactionTotalCorrect(
      '0.00004 GoerliETH',
    );

    await TransactionConfirmationView.tapEstimatedGasLink();

    await TransactionConfirmationView.isPriorityEditScreenVisible();

    await TransactionConfirmationView.tapLowPriorityGasOption();

    await TransactionConfirmationView.tapAdvancedOptionsPriorityGasOption();

    await TransactionConfirmationView.tapMarketPriorityGasOption();

    await TransactionConfirmationView.isMaxPriorityFeeCorrect('1.5');

    await TransactionConfirmationView.tapAggressivePriorityGasOption();

    await TransactionConfirmationView.isMaxPriorityFeeCorrect('2');

    await TransactionConfirmationView.tapMaxPriorityFeeSaveButton();

    await TransactionConfirmationView.isVisible();
  });

  it('should send eth', async () => {
    // Tap on the send button
    await TransactionConfirmationView.tapConfirmButton();

    // Check that we are on the wallet screen
    await WalletView.isVisible();
  });
});
