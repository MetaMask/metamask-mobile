'use strict';
import { Smoke } from '../../tags';

import TestHelpers from '../../helpers';
import LoginView from '../../pages/LoginView';
import WalletView from '../../pages/WalletView';
import AccountListView from '../../pages/AccountListView';
import DrawerView from '../../pages/Drawer/DrawerView';
import SettingsView from '../../pages/Drawer/Settings/SettingsView';
import SecurityAndPrivacy from '../../pages/Drawer/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import Accounts from '../../../wdio/helpers/Accounts';
import { PRIVATE_KEY_PASSWORD_INPUT_BOX_ID } from '../../../app/constants/test-ids';
import ShowPrivateKey from '../../pages/Drawer/Settings/SecurityAndPrivacy/ShowPrivateKey';

describe(Smoke('Wallet Tests'), () => {
  const GOERLI = 'Goerli Test Network';
  const ETHEREUM = 'Ethereum Main Network';

  const validAccount = Accounts.getValidAccount();

  beforeEach(() => {
    jest.setTimeout(200000);
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });

  it('should present error with invalid password', async () => {
    await WalletView.tapDrawerButton();
    await DrawerView.isVisible();
    await DrawerView.tapSettings();
    //should there be assertions here?  isVisible does not yet exist on this view
    await SettingsView.tapSecurityAndPrivacy();
    //should there be assertions here?  isVisible does not yet exist on this view
    await SecurityAndPrivacy.scrollToShowPrivateKeyFor();
    TestHelpers.delay(1000);
    await SecurityAndPrivacy.tapShowPrivateKey();
    await ShowPrivateKey.enterIncorrectPassword(validAccount.incorrectPassword,);
    await ShowPrivateKey.passwordWarningIsVisible();
  });

  it('should reveal private key', async () => {
    await TestHelpers.clearField(PRIVATE_KEY_PASSWORD_INPUT_BOX_ID);
    await ShowPrivateKey.enterPassword(validAccount.password);
    await ShowPrivateKey.longPressAndHoldToRevealPrivateKey();
    await ShowPrivateKey.isPrivateKeyTextCorrect();
  });
});
