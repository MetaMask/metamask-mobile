'use strict';

import { Regression } from '../../tags';
import TestHelpers from '../../helpers';

import AmountView from '../../pages/AmountView';
import SendView from '../../pages/SendView';
import TransactionConfirmationView from '../../pages/TransactionConfirmView';
import {
  importWalletWithRecoveryPhrase,
  addLocalhostNetwork,
} from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import Accounts from '../../../wdio/helpers/Accounts';
import Ganache from '../../../app/util/test/ganache';

const validAccount = Accounts.getValidAccount();
const MYTH_ADDRESS = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';

describe(Regression('Send ETH Tests'), () => {
  let ganacheServer;
  beforeAll(async () => {
    jest.setTimeout(150000);
    if (device.getPlatform() === 'android') {
      await device.reverseTcpPort('8081'); // because on android we need to expose the localhost ports to run ganache
      await device.reverseTcpPort('8545');
    }
    ganacheServer = new Ganache();
    await ganacheServer.start({ mnemonic: validAccount.seedPhrase });
  });

  afterAll(async () => {
    await ganacheServer.quit();
  });

  it('should go to send view', async () => {
    await importWalletWithRecoveryPhrase();
    await addLocalhostNetwork();
    await TestHelpers.delay(4000);
    // Navigate to send flow
    await TabBarComponent.tapActions();
    await WalletActionsModal.tapSendButton();
    // Make sure view with my accounts visible
    await SendView.isMyAccountsVisisble();
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
    await TestHelpers.delay(2500);

    await AmountView.tapCurrencySwitch();
    await TestHelpers.delay(2500); // android is running a bit quicker and it is having a hard time asserting that the text is visible.
    await AmountView.isTransactionAmountConversionValueCorrect('0.004 ETH');
    await TestHelpers.delay(4000);
    await AmountView.tapCurrencySwitch();
    await TestHelpers.delay(2500);

    await AmountView.isTransactionAmountCorrect('0.004');
  });

  it('should input and validate amount', async () => {
    // Type in a non numeric value
    await AmountView.typeInTransactionAmount('0xA');
    // Click next and check that error is shown
    await TestHelpers.delay(3000);
    await AmountView.tapNextButton();
    await AmountView.isAmountErrorVisible();
    // Type in a negative value
    await AmountView.typeInTransactionAmount('-10');
    // Click next and check that error is shown
    await AmountView.tapNextButton();
    await AmountView.isAmountErrorVisible();
    // Input acceptable value
    await AmountView.typeInTransactionAmount('0.00001');
    await AmountView.tapNextButton();

    // Check that we are on the confirm view
    await TransactionConfirmationView.isVisible();
  });

  it('should send ETH to Account 2', async () => {
    await TestHelpers.delay(2000);

    // Check that the amount is correct
    await TransactionConfirmationView.isTransactionTotalCorrect('0.00001 ETH');
    // Tap on the Send CTA
    await TransactionConfirmationView.tapConfirmButton();
    // Check that we are on the wallet screen
    //await WalletView.isVisible();
  });
});
