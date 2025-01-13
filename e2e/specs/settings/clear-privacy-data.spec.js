'use strict';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';

import SettingsView from '../../pages/Settings/SettingsView';
import SecurityAndPrivacyView from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';

import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import Assertions from '../../utils/Assertions';
import ClearPrivacyModal from '../../pages/Settings/SecurityAndPrivacy/ClearPrivacyModal';
import BrowserView from '../../pages/Browser/BrowserView';
import ConnectedAccountsModal from '../../pages/Browser/ConnectedAccountsModal';

describe(Regression('Clear Privacy data'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should clear all dapp connections', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapBrowser();
        await BrowserView.navigateToTestDApp();
        await BrowserView.tapNetworkAvatarButtonOnBrowser();
        await Assertions.checkIfVisible(ConnectedAccountsModal.title);
        await ConnectedAccountsModal.scrollToBottomOfModal();

        // should go to settings then security & privacy
        await TabBarComponent.tapSettings();
        await SettingsView.tapSecurityAndPrivacy();
        await SecurityAndPrivacyView.scrollToClearPrivacyData();
        await SecurityAndPrivacyView.tapClearPrivacyData();

        await Assertions.checkIfVisible(ClearPrivacyModal.container);
        await ClearPrivacyModal.tapClearButton();

        await TabBarComponent.tapBrowser();
        await BrowserView.tapNetworkAvatarButtonOnBrowser();
        await Assertions.checkIfNotVisible(ConnectedAccountsModal.title);
      },
    );
  });
});
