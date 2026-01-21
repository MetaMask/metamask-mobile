import { SmokeAccounts } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import LoginView from '../../pages/wallet/LoginView';
import ForgotPasswordModalView from '../../pages/Common/ForgotPasswordModalView';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import WalletView from '../../pages/wallet/WalletView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import Assertions from '../../framework/Assertions';
import { loginToApp } from '../../viewHelper';

describe(SmokeAccounts('Social Login - Reset Password'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('should allow user to reset wallet when forgot password', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        // Login to app
        await loginToApp();
        await Assertions.expectElementToBeVisible(WalletView.container);

        // Navigate to Settings and Lock the app
        await TabBarComponent.tapSettings();
        await SettingsView.tapLock();
        await SettingsView.tapYesAlertButton();

        // Verify Login screen is visible
        await Assertions.expectElementToBeVisible(LoginView.container);

        // Tap "Forgot Password" button
        await LoginView.tapForgotPassword();

        // ForgotPasswordModal should appear
        await Assertions.expectElementToBeVisible(
          ForgotPasswordModalView.container,
        );

        // Tap "Reset Wallet" button
        await ForgotPasswordModalView.tapResetWalletButton();

        // Tap to confirm
        await ForgotPasswordModalView.tapYesResetWalletButton();

        // Verify user is redirected to Onboarding screen
        await Assertions.expectElementToBeVisible(OnboardingView.container);
      },
    );
  });

  it('should allow user to cancel reset wallet flow', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        // Login and lock the app
        await loginToApp();
        await TabBarComponent.tapSettings();
        await SettingsView.tapLock();
        await SettingsView.tapYesAlertButton();

        // Verify Login screen is visible
        await Assertions.expectElementToBeVisible(LoginView.container);

        // Tap "Forgot Password" button
        await LoginView.tapForgotPassword();

        // ForgotPasswordModal
        await Assertions.expectElementToBeVisible(
          ForgotPasswordModalView.container,
        );

        // Tap "Reset wallet"
        await ForgotPasswordModalView.tapResetWalletButton();

        // Tap "Cancel" button to dismiss the modal
        await ForgotPasswordModalView.tapCancelButton();

        // Modal dismissed
        await Assertions.expectElementToBeVisible(LoginView.container);
      },
    );
  });

  it('should show success notification after wallet reset', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        // Login and lock the app
        await loginToApp();
        await TabBarComponent.tapSettings();
        await SettingsView.tapLock();
        await SettingsView.tapYesAlertButton();

        // Navigate through reset flow
        await Assertions.expectElementToBeVisible(LoginView.container);
        await LoginView.tapForgotPassword();
        await ForgotPasswordModalView.tapResetWalletButton();
        await ForgotPasswordModalView.tapYesResetWalletButton();

        // Verify success notification appears
        await Assertions.expectElementToBeVisible(
          ForgotPasswordModalView.successBottomNotification,
        );

        // Verify on Onboarding screen
        await Assertions.expectElementToBeVisible(OnboardingView.container);
      },
    );
  });
});
