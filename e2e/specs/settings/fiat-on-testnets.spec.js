'use strict';
import { SmokeAssets } from '../../tags';
import SettingsView from '../../pages/Settings/SettingsView';
import TabBarComponent from '../../pages/TabBarComponent';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { CustomNetworks } from '../../resources/networks.e2e';
import NetworkListModal from '../../pages/modals/NetworkListModal';
import WalletView from '../../pages/WalletView';
import NetworkEducationModal from '../../pages/modals/NetworkEducationModal';
import AdvancedSettingsView from '../../pages/Settings/AdvancedView';
import { TOTAL_BALANCE_TEXT } from '../../../wdio/screen-objects/testIDs/Components/Tokens.testIds.js';
import FiatOnTestnetsModal from '../../pages/modals/FiatOnTestnetsModal.js';
import Assertions from '../../utils/Assertions.js';
import Matchers from '../../utils/Matchers.js';
import TestHelpers from '../../helpers.js';

const SEPOLIA = CustomNetworks.Sepolia.providerConfig.nickname;

describe(SmokeAssets('Fiat On Testnets Setting'), () => {
  beforeEach(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should show fiat values on testnets when enabled', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        // Switch to Sepolia
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.changeNetworkTo(SEPOLIA);
        await NetworkEducationModal.tapGotItButton();

        // Verify no fiat values displayed
        await Assertions.checkIfHasText(
          Matchers.getElementByID(TOTAL_BALANCE_TEXT),
          '$0',
        );

        // Wait for network switch toast to disapear
        await TestHelpers.delay(2500);

        // Enable fiat on testnets setting
        await TabBarComponent.tapSettings();
        await SettingsView.tapAdvancedTitle();
        await AdvancedSettingsView.scrollToShowFiatOnTestnetsToggle();
        await AdvancedSettingsView.tapShowFiatOnTestnetsSwitch();
        await FiatOnTestnetsModal.tapContinueButton();

        // Verify fiat values are displayed
        await TabBarComponent.tapWallet();
        await Assertions.checkIfElementNotToHaveText(
          Matchers.getElementByID(TOTAL_BALANCE_TEXT),
          '$0',
        );
      },
    );
  });
});
