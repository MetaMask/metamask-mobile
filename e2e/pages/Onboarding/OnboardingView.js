import TestHelpers from '../../helpers';

const container = 'onboarding-screen';
const createWalletButton = 'create-wallet-button';
//const importUsingSecretRecoveryPhrase = 'import-wallet-import-from-seed-button';
export default class OnboardingView {
	static async tapCreateWallet() {
		await TestHelpers.tap(createWalletButton);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(container);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(container);
	}
}
