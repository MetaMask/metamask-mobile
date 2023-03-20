'use strict';
import { importWalletWithRecoveryPhrase } from '../viewHelper';

import WalletView from '../pages/WalletView';
import ImportTokensView from '../pages/ImportTokensView';

import DrawerView from '../pages/Drawer/DrawerView';

import SettingsView from '../pages/Drawer/Settings/SettingsView';
import GeneralView from '../pages/Drawer/Settings/GeneralView';

const TOKEN_NAME = 'XRPL';

describe('Hide Zero Balance Tokens', () => {
  beforeEach(() => {
    jest.setTimeout(170000);
  });

  it('should import wallet', async () => {
    await importWalletWithRecoveryPhrase();
  });

  it('should add a token', async () => {
    await WalletView.tapImportTokensButton();
    await ImportTokensView.typeInTokenName(TOKEN_NAME);

    await ImportTokensView.tapOnToken();

    await ImportTokensView.tapImportButton();
  });

  it('should go to settings then General', async () => {
    await WalletView.tapDrawerButton();
    await DrawerView.tapSettings();
    await SettingsView.tapGeneral();
  });

  it('should toggle off zero balance tokens', async () => {
    await GeneralView.scrollToBottomOfView();
    await GeneralView.toggleHideZeroBalance();
  });

  it('Should return to the wallet view', async () => {
    await GeneralView.tapBackButton();
    await SettingsView.tapCloseButton();
  });

  it('Zero balance Token should not be on token list', async () => {
    await WalletView.tokenIsNotVisibleInWallet(TOKEN_NAME);
  });
});
