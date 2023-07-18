'use strict';
import { Smoke } from '../tags';

import WalletView from '../pages/WalletView';

import LoginView from '../pages/LoginView';
import { withFixtures } from '../fixtures/fixture-helper';
import FixtureBuilder from '../fixtures/fixture-builder';

const PASSWORD = '123123123';

describe(Smoke('Skip Onboarding to test fixtures'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('should launch the app and log in', async () => {
    const fixture = new FixtureBuilder().build();
    await withFixtures({ fixture, restartDevice: true }, async () => {
      await LoginView.isVisible();
      await LoginView.enterPassword(PASSWORD);

      await WalletView.isVisible();
    });
  });
});
