'use strict';
import TestHelpers from '../../helpers';
import { SmokeCore } from '../../tags';

import SettingsView from '../../pages/Settings/SettingsView';

import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import CommonView from '../../pages/CommonView';
import Assertions from '../../utils/Assertions';
import ImportTokensView from '../../pages/ImportTokensView';
import WalletView from '../../pages/WalletView';
import GeneralView from '../../pages/Settings/GeneralView';
import Matchers from '../../utils/Matchers';

const TOKEN_NAME = 'XRPL';
const TOKEN_NAME_ELEMENT = Matchers.getElementByText(TOKEN_NAME);
describe(SmokeCore('enables hide tokens with zero balance'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should hide zero balance tokens', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapImportTokensButton();
        await ImportTokensView.typeInTokenName(TOKEN_NAME);

        await ImportTokensView.tapOnToken();

        await ImportTokensView.tapImportButton();
        await Assertions.checkIfNotVisible(CommonView.toast);

        // should go to settings then security & privacy
        await TabBarComponent.tapSettings();
        await SettingsView.tapGeneralSettings();

        await GeneralView.scrollToHideTokensToggle();
        await GeneralView.toggleHideZeroBalance();
        await Assertions.checkIfToggleIsOn(GeneralView.hideTokenBalanceToggle);

        await TabBarComponent.tapWallet();

        await Assertions.checkIfNotVisible(TOKEN_NAME_ELEMENT);
      },
    );
  });
});
