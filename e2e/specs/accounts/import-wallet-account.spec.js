'use strict';
import { SmokeAccounts } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import ImportAccountView from '../../pages/importAccount/ImportAccountView';
import Assertions from '../../utils/Assertions';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import CommonView from '../../pages/CommonView';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView';
import TestHelpers from '../../helpers';

describe(SmokeAccounts('Import account via private to wallet'), () => {
  // This key is for testing private key import only
  // I should NEVER hold any eth or token
  const TEST_PRIVATE_KEY =
    'cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1';

  beforeAll(async () => {
    jest.setTimeout(200000);
    await TestHelpers.launchApp();
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase({
      seedPhrase: process.env.MM_TEST_WALLET_SRP,
    });
  });

  it('should be able to import account', async () => {
    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapImportAccount();
    await Assertions.checkIfVisible(ImportAccountView.container);
    // Tap on import button to make sure alert pops up
    await ImportAccountView.tapImportButton();
    await CommonView.tapOKAlertButton();
    await ImportAccountView.enterPrivateKey(TEST_PRIVATE_KEY);
    await Assertions.checkIfVisible(SuccessImportAccountView.container);
    await SuccessImportAccountView.tapCloseButton();
    await AccountListBottomSheet.swipeToDismissAccountsModal();
    await Assertions.checkIfVisible(WalletView.container);
    await Assertions.checkIfElementNotToHaveText(
      WalletView.accountName,
      'Account 1',
    );
  });
});
