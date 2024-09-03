'use strict';
import { SmokeAccounts } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import AccountListView from '../../pages/AccountListView';
import Assertions from '../../utils/Assertions';
import AddAccountModal from '../../pages/modals/AddAccountModal';

const AccountTwoText = 'Account 2';

describe(SmokeAccounts('Create wallet account'), () => {
  beforeAll(async () => {
    jest.setTimeout(200000);
    await device.launchApp();
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });

  it('should be able to add new accounts', async () => {
    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(AccountListView.accountList);
    await AccountListView.tapAddAccountButton();
    // Tap on Create New Account
    await AddAccountModal.tapCreateAccount();
    await Assertions.checkIfTextIsDisplayed(AccountTwoText);
  });
});
