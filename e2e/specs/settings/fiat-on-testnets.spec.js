'use strict';
import { SmokeNetworkAbstractions } from '../../tags';
import SettingsView from '../../pages/Settings/SettingsView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { CustomNetworks } from '../../resources/networks.e2e';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import WalletView from '../../pages/wallet/WalletView';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import AdvancedSettingsView from '../../pages/Settings/AdvancedView';
import FiatOnTestnetsBottomSheet from '../../pages/Settings/Advanced/FiatOnTestnetsBottomSheet';
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers.js';

const SEPOLIA = CustomNetworks.Sepolia.providerConfig.nickname;

describe.skip(SmokeNetworkAbstractions('Fiat On Testnets Setting'), () => {
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
        await NetworkListModal.scrollToBottomOfNetworkList();
        await NetworkListModal.changeNetworkTo(SEPOLIA);
        await NetworkEducationModal.tapGotItButton();

        // Verify no fiat values displayed
        await Assertions.expectTextDisplayed(WalletView.totalBalance, '$0.00');

        // Enable fiat on testnets setting
        await TabBarComponent.tapSettings();
        await SettingsView.tapAdvancedTitle();
        await AdvancedSettingsView.scrollToShowFiatOnTestnetsToggle();
        await AdvancedSettingsView.tapShowFiatOnTestnetsSwitch();
        await FiatOnTestnetsBottomSheet.tapContinueButton();

        // Verify fiat values are displayed
        await TabBarComponent.tapWallet();
        await Assertions.expectTextNotDisplayed(WalletView.totalBalance, '$0');
      },
    );
  });
});
