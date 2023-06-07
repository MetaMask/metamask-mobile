'use strict';
import { Regression, Smoke } from '../tags';

import WalletView from '../pages/WalletView';

import LoginView from '../pages/LoginView';

const PASSWORD = '123123123';

describe(Regression('Skip Onboarding to test fixtures'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should relaunch the app and log in', async () => {
    await LoginView.isVisible();
    await LoginView.enterPassword(PASSWORD);

    await WalletView.isVisible();
  });
});

describe(Smoke('Skip Onboarding to test fixtures 2'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should relaunch the app and log in', async () => {
    await LoginView.isVisible();
    await LoginView.enterPassword(PASSWORD);

    await WalletView.isVisible();
  });
});
