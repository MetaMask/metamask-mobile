'use strict';

import TestHelpers from '../helpers';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ImportWalletView from '../pages/Onboarding/ImportWalletView';

//import SecurityAndPrivacy from '../pages/Drawer/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
//import RevealSecretRecoveryPhrase from '../pages/Drawer/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase';
import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';
import LoginView from '../pages/LoginView';
import EnableAutomaticSecurityChecksView from '../pages/EnableAutomaticSecurityChecksView';

//import DrawerView from '../pages/Drawer/DrawerView';
//import SettingsView from '../pages/Drawer/Settings/SettingsView';
import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import WhatsNewModal from '../pages/modals/WhatsNewModal';
import { acceptTermOfUse } from '../viewHelper';
import Accounts from '../../wdio/helpers/Accounts';

describe('Import seedphrase flow', () => {
  let validAccount;
  let invalidAccount;
  let shortPasswordAccount;

  beforeAll(() => {
    validAccount = Accounts.getValidAccount();
    invalidAccount = Accounts.getInvalidAccount();
    shortPasswordAccount = Accounts.getShortPasswordAccount();
  });

  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should go to import wallet view', async () => {
    await OnboardingCarouselView.isVisible();
    await OnboardingCarouselView.tapOnGetStartedButton();

    await OnboardingView.isVisible();
    await OnboardingView.tapImportWalletFromSeedPhrase();

    await MetaMetricsOptIn.isVisible();
    await MetaMetricsOptIn.tapAgreeButton();
    await acceptTermOfUse();

    await ImportWalletView.isVisible();
  });

  it('should attempt to import wallet with invalid secret recovery phrase', async () => {
    await ImportWalletView.enterSecretRecoveryPhrase(invalidAccount.seedPhrase);
    await ImportWalletView.enterPassword(invalidAccount.password);
    await ImportWalletView.reEnterPassword(invalidAccount.password);
    await ImportWalletView.secretRecoveryPhraseErrorIsVisible();
    await ImportWalletView.tapOKAlertButton();

    ///
  });

  it('should import wallet with valid secret recovery phrase but short password', async () => {
    await ImportWalletView.clearSecretRecoveryPhraseInputBox();
    await ImportWalletView.enterSecretRecoveryPhrase(
      shortPasswordAccount.seedPhrase,
    );
    await ImportWalletView.enterPassword(shortPasswordAccount.password);
    await ImportWalletView.reEnterPassword(shortPasswordAccount.password);
    await ImportWalletView.passwordLengthErrorIsVisible();
    await ImportWalletView.tapOKAlertButton();
  });

  it('should import wallet with valid secret recovery phrase and password', async () => {
    await ImportWalletView.enterPassword(validAccount.password);
    await ImportWalletView.reEnterPassword(validAccount.password);
    await WalletView.isVisible();
  });

  it('Should dismiss Automatic Security checks screen', async () => {
    await TestHelpers.delay(3500);
    await EnableAutomaticSecurityChecksView.isVisible();
    await EnableAutomaticSecurityChecksView.tapNoThanks();
  });

  it('should tap on the close button in the whats new modal', async () => {
    // dealing with flakiness on bitrise.
    await TestHelpers.delay(2500);
    try {
      await WhatsNewModal.isVisible();
      await WhatsNewModal.tapCloseButton();
    } catch {
      //
    }
  });

  it('should dismiss the onboarding wizard', async () => {
    // dealing with flakiness on bitrise.
    await TestHelpers.delay(1000);
    try {
      await OnboardingWizardModal.isVisible();
      await OnboardingWizardModal.tapNoThanksButton();
      await OnboardingWizardModal.isNotVisible();
    } catch {
      //
    }
  });

  // it('should validate secret recovery phrase in settings', async () => {
  //   await WalletView.tapDrawerButton();

  //   await DrawerView.isVisible();
  //   await DrawerView.tapSettings();

  //   await SettingsView.tapSecurityAndPrivacy();

  //   await SecurityAndPrivacy.tapRevealSecretRecoveryPhrase();
  //   await RevealSecretRecoveryPhrase.isVisible();
  //   await RevealSecretRecoveryPhrase.enterPassword(SHORT_PASSWORD);
  //   // Ensure error is displayed
  //   await RevealSecretRecoveryPhrase.passwordWarningIsVisible();
  //   await RevealSecretRecoveryPhrase.enterPassword(CORRECT_PASSWORD);

  //   await RevealSecretRecoveryPhrase.passwordInputIsNotVisible();
  //   // Seed phrase should now be revealed
  //   await RevealSecretRecoveryPhrase.isSecretRecoveryPhraseTouchableBoxVisible();
  //   // Check that the seed phrase displayed matches what we inputted in the beginning
  //   await RevealSecretRecoveryPhrase.isSecretRecoveryPhraseTextCorrect(CORRECT_SECRET_RECOVERY_PHRASE);
  // });

  it('should be able to log in', async () => {
    // Relaunch app
    await TestHelpers.relaunchApp();

    // Check that we are on login screen
    await LoginView.isVisible();
    await LoginView.enterPassword(shortPasswordAccount.password);
    await LoginView.isLoginErrorVisible();

    await LoginView.enterPassword(validAccount.password);

    await WalletView.isVisible();
  });
});
