'use strict';
import { Regression } from '../tags';

import WalletView from '../pages/WalletView';

import { importWalletWithRecoveryPhrase } from '../viewHelper';

import AccountListView from '../pages/AccountListView';
import ImportAccountView from '../pages/ImportAccountView';

describe(Regression('Import account via private to wallet'), () => {
  // This key is for testing private key import only
  // I should NEVER hold any eth or token
  const TEST_PRIVATE_KEY =
    'cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1';

  beforeEach(() => {
    jest.setTimeout(200000);
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });

  it('should be able to import account', async () => {
    await WalletView.tapIdenticon();
    await AccountListView.isVisible();
    await AccountListView.tapAddAccountButton();
    await AccountListView.tapImportAccountButton();

    await ImportAccountView.isVisible();
    // Tap on import button to make sure alert pops up
    await ImportAccountView.tapImportButton();
    await ImportAccountView.tapOKAlertButton();

    await ImportAccountView.enterPrivateKey(TEST_PRIVATE_KEY);
    await ImportAccountView.isImportSuccessSreenVisible();
    await ImportAccountView.tapCloseButtonOnImportSuccess();

    await AccountListView.swipeToDimssAccountsModal();

    await WalletView.isVisible();
    await WalletView.isAccountNameCorrect('Account 3');
  });
});
