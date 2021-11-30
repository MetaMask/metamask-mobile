'use strict';

import TestHelpers from '../helpers';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ImportWalletView from '../pages/Onboarding/ImportWalletView';

import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';
import LoginView from '../pages/LoginView';

import DrawerView from '../pages/Drawer/DrawerView';

import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import DeleteWalletModal from '../pages/modals/DeleteWalletModal';

const SECRET_RECOVERY_PHRASE =
	'ketchup width ladder rent cheap eye torch employ quantum evidence artefact render protect delay wrap identify valley umbrella yard ridge wool swap differ kidney';
const PASSWORD = `12345678`;

describe('Import wallet with 24 word seedphrase and delete wallet flow', () => {
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

	it('should import wallet with valid secret recovery phrase and password', async () => {
		await ImportWalletView.clearSecretRecoveryPhraseInputBox();
		await ImportWalletView.enterSecretRecoveryPhrase(SECRET_RECOVERY_PHRASE);
		await ImportWalletView.enterPassword(PASSWORD);
		await ImportWalletView.reEnterPassword(PASSWORD);
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

	it('should open drawer and log out', async () => {
		await WalletView.tapDrawerButton();

		await DrawerView.isVisible();
		await DrawerView.tapLogOut();
		await DrawerView.tapYesAlertButton();
		await LoginView.isVisible();
	});

	it('should tap reset wallet button', async () => {
		await LoginView.tapResetWalletButton();

		await DeleteWalletModal.isVisible();
	});
	it('should delete wallet', async () => {
		await DeleteWalletModal.tapIUnderstandButton();
		await DeleteWalletModal.typeDeleteInInputBox();

		await TestHelpers.delay(2000);
		await OnboardingView.isVisible();
	});
});
