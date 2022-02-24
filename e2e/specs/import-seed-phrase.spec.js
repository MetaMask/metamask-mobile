'use strict';

import TestHelpers from '../helpers';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ImportWalletView from '../pages/Onboarding/ImportWalletView';

import SecurityAndPrivacy from '../pages/Drawer/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import RevealSecretRecoveryPhrase from '../pages/Drawer/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase';

import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';

import DrawerView from '../pages/Drawer/DrawerView';
import SettingsView from '../pages/Drawer/Settings/SettingsView';

import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import KeepYourSRPSafeModal from '../pages/modals/KeepYourSRPSafeModal';

const CORRECT_SECRET_RECOVERY_PHRASE = 'fold media south add since false relax immense pause cloth just raven';
const CORRECT_PASSWORD = `12345678`;

describe('Import seedphrase flow', () => {
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

		await ImportWalletView.isVisible();
	});

	it('should import wallet with valid secret recovery phrase but short password', async () => {
		await ImportWalletView.clearSecretRecoveryPhraseInputBox();
		await ImportWalletView.enterSecretRecoveryPhrase(CORRECT_SECRET_RECOVERY_PHRASE);
		await ImportWalletView.enterPassword(CORRECT_PASSWORD);
		await ImportWalletView.reEnterPassword(CORRECT_PASSWORD);
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

		// Ensure error is displayed
		// await RevealSecretRecoveryPhrase.enterPassword(SHORT_PASSWORD);
		// await RevealSecretRecoveryPhrase.passwordWarningIsVisible();

		await RevealSecretRecoveryPhrase.enterPassword(CORRECT_PASSWORD);
		await KeepYourSRPSafeModal.isVisible();
		await KeepYourSRPSafeModal.tapAndHoldToRevealSecretRecoveryPhraseButton();

		// Seed phrase should now be revealed
		// await RevealSecretRecoveryPhrase.isSecretRecoveryPhraseTouchableBoxVisible();
		// await RevealSecretRecoveryPhrase.isSecretRecoveryPhraseTextCorrect(CORRECT_SECRET_RECOVERY_PHRASE);
	});

	// it('should be able to log in', async () => {
	// 	// Relaunch app
	// 	await TestHelpers.relaunchApp();

	// 	// Check that we are on login screen
	// 	await LoginView.isVisible();
	// 	await LoginView.enterPassword(SHORT_PASSWORD);
	// 	await LoginView.isLoginErrorVisible();

	// 	await LoginView.enterPassword(CORRECT_PASSWORD);

	// 	await WalletView.isVisible();
	// });
});
