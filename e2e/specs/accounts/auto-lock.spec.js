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
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import AutoLockModal from '../../pages/Settings/SecurityAndPrivacy/AutoLockModal';
import Assertions from '../../utils/Assertions.js';
import WalletView from '../../pages/wallet/WalletView.js';
import LoginView from '../../pages/wallet/LoginView.js';

const fixtureServer = new FixtureServer();

describe(Regression('Auto-Lock'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withImportedAccountKeyringController()
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('backgrounds then relaunches without needing password on default auto-lock setting', async () => {
    await device.sendToHome();
    await TestHelpers.launchApp();
    await Assertions.checkIfVisible(WalletView.container);
  });

  it('sets auto-lock to immediately then requires password to reopen from background', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapSecurityAndPrivacy();
    await SecurityAndPrivacy.scrollToAutoLockSection();
    await SecurityAndPrivacy.tapAutoLock30Seconds();
    await AutoLockModal.tapAutoLockImmediately();
    await TabBarComponent.tapWallet();
    await device.sendToHome();
    await TestHelpers.launchApp();
    await Assertions.checkIfNotVisible(WalletView.container);
    await Assertions.checkIfVisible(LoginView.container);
  });
});
