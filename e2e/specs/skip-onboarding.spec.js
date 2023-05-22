'use strict';
import { Regression } from '../tags';

import WalletView from '../pages/WalletView';

import LoginView from '../pages/LoginView';

const PASSWORD = '123123123';

describe(Regression('Skip Onboarding to test fixtures'), () => {
  it('should relaunch the app and log in', async () => {
    await LoginView.isVisible();
    await LoginView.enterPassword(PASSWORD);

    await WalletView.isVisible();
  });
});
