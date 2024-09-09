'use strict';

import { Regression } from '../../tags.js';
import TestHelpers from '../../helpers.js';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { loginToApp } from '../../viewHelper.js';
import TabBarComponent from '../../pages/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import AutoLockModal from '../../pages/modals/AutoLockModal';
import Assertions from '../../utils/Assertions.js';
import WalletView from '../../pages/wallet/WalletView.js';
import LoginView from '../../pages/LoginView.js';

const fixtureServer = new FixtureServer();

describe(Regression('Auto-Lock'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withImportedAccountKeyringController()
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('navigate to device home screen and back to app without needing password on default auto lock setting', async () => {
    await device.sendToHome();
    await device.launchApp();
    await Assertions.checkIfVisible(WalletView.container);
  });

  it('set auto-lock to Immediately and confirm lock', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapSecurityAndPrivacy();
    await SecurityAndPrivacy.scrollToAutoLockSection();
    await SecurityAndPrivacy.tapAutoLock30Seconds();
    await AutoLockModal.tapAutoLockImmediately();
    await TabBarComponent.tapWallet();
    await device.sendToHome();
    await device.launchApp();
    await Assertions.checkIfNotVisible(WalletView.container);
    await LoginView.isVisible();
  });
});
