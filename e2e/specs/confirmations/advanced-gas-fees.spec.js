'use strict';
import WalletView from '../../pages/WalletView';
import SendView from '../../pages/SendView';
import AmountView from '../../pages/AmountView';
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
const VALID_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';

describe('Advanced Gas Fees and Priority Tests', () => {
  let ganacheServer;
  beforeAll(async () => {
    jest.setTimeout(170000);

    ganacheServer = new Ganache();
    await ganacheServer.start({ mnemonic: validAccount.seedPhrase });
  });

  afterAll(async () => {
    await ganacheServer.quit();
  });

  it('should import wallet and go to send view', async () => {
    await importWalletWithRecoveryPhrase();
    await addLocalhostNetwork();
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
    await AmountView.typeInTransactionAmount('1');
    await AmountView.tapNextButton();

    // Check that we are on the confirm view
    await TransactionConfirmationView.isVisible();

    // Check that the amount is correct
    await TransactionConfirmationView.isTransactionTotalCorrect('1 ETH');

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
