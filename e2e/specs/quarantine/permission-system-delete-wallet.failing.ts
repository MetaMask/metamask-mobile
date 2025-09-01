import TestHelpers from '../../helpers';
import { RegressionNetworkAbstractions } from '../../tags';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import ProtectYourWalletView from '../../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../../pages/Onboarding/CreatePasswordView';
import WalletView from '../../pages/wallet/WalletView';
import Browser from '../../pages/Browser/BrowserView';
import SettingsView from '../../pages/Settings/SettingsView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SkipAccountSecurityModal from '../../pages/Onboarding/SkipAccountSecurityModal';
import ConnectedAccountsModal from '../../pages/Browser/ConnectedAccountsModal';
import DeleteWalletModal from '../../pages/Settings/SecurityAndPrivacy/DeleteWalletModal';
import LoginView from '../../pages/wallet/LoginView';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import MetaMetricsOptIn from '../../pages/Onboarding/MetaMetricsOptInView';
import ProtectYourWalletModal from '../../pages/Onboarding/ProtectYourWalletModal';
import OnboardingSuccessView from '../../pages/Onboarding/OnboardingSuccessView';
import Assertions from '../../framework/Assertions';
import ToastModal from '../../pages/wallet/ToastModal';
import OnboardingSheet from '../../pages/Onboarding/OnboardingSheet';
import { DappVariants } from '../../framework/Constants';

const SEEDLESS_ONBOARDING_ENABLED =
  process.env.SEEDLESS_ONBOARDING_ENABLED === 'true';

const PASSWORD = '12345678';

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe(RegressionNetworkAbstractions('Permission System'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should no longer be connected to the dapp after deleting wallet', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        //validate connection to test dapp
        await TabBarComponent.tapBrowser();
        await Assertions.expectElementToBeVisible(Browser.browserScreenID);
        await Browser.navigateToTestDApp();
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectElementToBeVisible(ConnectedAccountsModal.title);
        await ConnectedAccountsModal.scrollToBottomOfModal();
        await TestHelpers.delay(2000);

        //go to settings then security & privacy
        await TabBarComponent.tapSettings();
        await SettingsView.tapLock();
        await SettingsView.tapYesAlertButton();
        await Assertions.expectElementToBeVisible(LoginView.container);

        // should tap reset wallet button
        await LoginView.tapForgotPassword();

        await Assertions.expectElementToBeVisible(DeleteWalletModal.container);

        //Delete wallet
        await DeleteWalletModal.tapIUnderstandButton();
        await DeleteWalletModal.typeDeleteInInputBox();
        await DeleteWalletModal.tapDeleteMyWalletButton();
        await Assertions.expectElementToNotBeVisible(
          DeleteWalletModal.container,
        );
        await TestHelpers.delay(2000);
        await Assertions.expectElementToBeVisible(OnboardingView.container);
        if (device.getPlatform() === 'ios') {
          await Assertions.expectElementToBeVisible(
            ToastModal.notificationTitle,
          );
          await Assertions.expectElementToNotBeVisible(
            ToastModal.notificationTitle,
          );
        } else {
          await TestHelpers.delay(3000);
        }
        await OnboardingView.tapCreateWallet();
        if (SEEDLESS_ONBOARDING_ENABLED) {
          await Assertions.expectElementToBeVisible(OnboardingSheet.container);
          await OnboardingSheet.tapImportSeedButton();
        }

        // Create new wallet
        await Assertions.expectElementToBeVisible(MetaMetricsOptIn.container);
        await MetaMetricsOptIn.tapAgreeButton();
        await Assertions.expectElementToBeVisible(CreatePasswordView.container);
        await CreatePasswordView.enterPassword(PASSWORD);
        await CreatePasswordView.reEnterPassword(PASSWORD);
        await CreatePasswordView.tapIUnderstandCheckBox();
        await CreatePasswordView.tapCreatePasswordButton();
        await Assertions.expectElementToBeVisible(
          ProtectYourWalletView.container,
        );
        await ProtectYourWalletView.tapOnRemindMeLaterButton();
        await SkipAccountSecurityModal.tapIUnderstandCheckBox();
        await SkipAccountSecurityModal.tapSkipButton();
        await OnboardingSuccessView.tapDone();
        await Assertions.expectElementToBeVisible(WalletView.container);
        await ProtectYourWalletModal.tapRemindMeLaterButton();
        await SkipAccountSecurityModal.tapIUnderstandCheckBox();
        await SkipAccountSecurityModal.tapSkipButton();

        //should no longer be connected to the  dapp
        await TabBarComponent.tapBrowser();
        await Assertions.expectElementToBeVisible(Browser.browserScreenID);
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectElementToNotBeVisible(
          ConnectedAccountsModal.title,
        );
        await NetworkListModal.scrollToBottomOfNetworkList();
        await Assertions.expectElementToBeVisible(
          NetworkListModal.testNetToggle,
        );
      },
    );
  });
});
