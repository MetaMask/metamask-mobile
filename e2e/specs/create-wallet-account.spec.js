'use strict';
import { Regression } from '../tags';

import WalletView from '../pages/WalletView';

import { importWalletWithRecoveryPhrase } from '../viewHelper';

import AccountListView from '../pages/AccountListView';

describe(Regression('Create wallet account'), () => {
  beforeEach(() => {
    jest.setTimeout(200000);
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });

  it('should be able to add new accounts', async () => {
    await WalletView.tapIdenticon();
    await AccountListView.isVisible();
    await AccountListView.tapAddAccountButton();

    // Tap on Create New Account
    await AccountListView.tapCreateAccountButton();
    await AccountListView.isNewAccountNameVisible();
  });
});
