'use strict';
import { SmokeAccounts } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../utils/Assertions';
import TestHelpers from '../../helpers';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';

const AccountTwoText = 'Account 2';

describe(SmokeAccounts('Create wallet account'), () => {
  beforeAll(async () => {
    jest.setTimeout(200000);
    await TestHelpers.launchApp();
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });

  it('should be able to add new accounts', async () => {
    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
    await AccountListBottomSheet.tapAddAccountButton();
    // Tap on Create New Account
    await AddAccountBottomSheet.tapCreateAccount();

    await Assertions.checkIfVisible(
      AccountListBottomSheet.accountNameInList(AccountTwoText),
    );
  });
});
