import { RegressionNetworkAbstractions } from '../../tags';
import SettingsView from '../../pages/Settings/SettingsView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { CustomNetworks } from '../../resources/networks.e2e';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import WalletView from '../../pages/wallet/WalletView';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import AdvancedSettingsView from '../../pages/Settings/AdvancedView';
import FiatOnTestnetsBottomSheet from '../../pages/Settings/Advanced/FiatOnTestnetsBottomSheet';
import Assertions from '../../framework/Assertions';

const SEPOLIA = CustomNetworks.Sepolia.providerConfig.nickname;

describe.skip(RegressionNetworkAbstractions('Fiat On Testnets Setting'), () => {
  // This test depends on the MM_REMOVE_GLOBAL_NETWORK_SELECTOR environment variable being set to false.
  const isRemoveGlobalNetworkSelectorEnabled =
    process.env.MM_REMOVE_GLOBAL_NETWORK_SELECTOR === 'true';
  const itif = (condition: boolean) => (condition ? it.skip : it);

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  itif(isRemoveGlobalNetworkSelectorEnabled)(
    'should show fiat values on testnets when enabled',
    async () => {
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
          await Assertions.expectElementToHaveText(
            WalletView.totalBalance as DetoxElement,
            '$0.00',
          );

          // Enable fiat on testnets setting
          await TabBarComponent.tapSettings();
          await SettingsView.tapAdvancedTitle();
          await AdvancedSettingsView.scrollToShowFiatOnTestnetsToggle();
          await AdvancedSettingsView.tapShowFiatOnTestnetsSwitch();
          await FiatOnTestnetsBottomSheet.tapContinueButton();

          // Verify fiat values are displayed
          await TabBarComponent.tapWallet();
          await Assertions.expectElementToNotHaveText(
            WalletView.totalBalance as DetoxElement,
            '$0',
          );
        },
      );
    },
  );
});
