import TestHelpers from '../../helpers';

const ONBOARDING_SCREEN_ID = 'onboarding-screen';
const CREATE_WALLET_BUTTON_ID = 'create-wallet-button';
const IMPORT_WALLET_BUTTON_ID = 'import-wallet-import-from-seed-button';
//const importUsingSecretRecoveryPhrase = 'import-wallet-import-from-seed-button';
export default class OnboardingView {
	static async tapCreateWallet() {
		await TestHelpers.tap(CREATE_WALLET_BUTTON_ID);
	}

	static async tapImportWalletFromSeedPhrase() {
		await TestHelpers.tap(IMPORT_WALLET_BUTTON_ID);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(ONBOARDING_SCREEN_ID);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(ONBOARDING_SCREEN_ID);
	}
}
