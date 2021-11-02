'use strict';

import TestHelpers from '../helpers';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ImportWalletView from '../pages/Onboarding/ImportWalletView';

import SecurityAndPrivacy from '../pages/Drawer/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import RevealSecretRecoveryPhrase from '../pages/Drawer/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase';

import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';
import LoginView from '../pages/LoginView';

import DrawerView from '../pages/Drawer/DrawerView';
import SettingsView from '../pages/Drawer/Settings/SettingsView';

import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';

const Incorrect_Seed_Words = 'fold media south add since false relax immense pause cloth just falcon';
const Correct_Seed_Words = 'fold media south add since false relax immense pause cloth just raven';
const Correct_Password = `12345678`;
const Incorrect_Password = `1234567`;
const Incorrect_Password2 = `12345679`;

describe('Import seedphrase flow', () => {
	beforeEach(() => {
		jest.setTimeout(150000);
	});

	it('should import via seed phrase and validate in settings', async () => {
		await OnboardingCarouselView.isVisible();
		await OnboardingCarouselView.tapOnGetStartedButton();

		await OnboardingView.isVisible();
		await OnboardingView.tapImportWalletFromSeedPhrase();

		await MetaMetricsOptIn.isVisible();
		await MetaMetricsOptIn.tapAgreeButton();

		await ImportWalletView.isVisible();
	});

	it('should attempt to import wallet with invalid secret recovery phrase', async () => {
		await ImportWalletView.enterSecretRecoveryPhrase(Incorrect_Seed_Words);
		await ImportWalletView.enterPassword(Incorrect_Password);
		await ImportWalletView.reEnterPassword(Incorrect_Password);
		await ImportWalletView.secretRecoveryPhraseErrorIsVisible();
		await ImportWalletView.tapOKAlertButton();

		///
	});

	it('should import wallet with valid secret recovery phrase but short password', async () => {
		await ImportWalletView.clearSecretRecoveryPhraseInputBox();
		await ImportWalletView.enterSecretRecoveryPhrase(Correct_Seed_Words);
		await ImportWalletView.enterPassword(Incorrect_Password);
		await ImportWalletView.reEnterPassword(Incorrect_Password);
		await ImportWalletView.passwordLengthErrorIsVisible();
		await ImportWalletView.tapOKAlertButton();
	});

	it('should import wallet with valid secret recovery phrase and password', async () => {
		await ImportWalletView.enterPassword(Correct_Password);
		await ImportWalletView.reEnterPassword(Correct_Password);
		await WalletView.isVisible();
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

	it('should validate secret recovery phrase in settings', async () => {
		await WalletView.tapDrawerButton();

		await DrawerView.isVisible();
		await DrawerView.tapSettings();

		await SettingsView.tapSecurityAndPrivacy();

		await SecurityAndPrivacy.tapRevealSecretRecoveryPhrase();
		await RevealSecretRecoveryPhrase.isVisible();
		await RevealSecretRecoveryPhrase.enterPassword(Incorrect_Password);
		// Ensure error is displayed
		await RevealSecretRecoveryPhrase.passwordWarningIsVisible();
		await RevealSecretRecoveryPhrase.enterPassword(Correct_Password);

		await RevealSecretRecoveryPhrase.passwordInputIsNotVisible();
		// Seed phrase should now be revealed
		await RevealSecretRecoveryPhrase.isSecretRecoveryPhraseTouchableBoxVisible();
		// Check that the seed phrase displayed matches what we inputted in the beginning
		await RevealSecretRecoveryPhrase.isSecretRecoveryPhraseTextCorrect(Correct_Seed_Words);
	});

	it('should be able to log in', async () => {
		// Relaunch app
		await TestHelpers.relaunchApp();

		// Check that we are on login screen
		await LoginView.isVisible();
		await LoginView.enterPassword(Incorrect_Password2);
		await LoginView.isLoginErrorVisible();

		await LoginView.enterPassword(Correct_Password);

		await WalletView.isVisible();
	});
});
