import TestHelpers from '../../helpers';
export default class OnboardingView {
	constructor() {
		this.container = 'onboarding-screen';
		this.createWalletButton = 'create-wallet-button';
		this.importUsingSecretRecoveryPhrase = 'import-wallet-import-from-seed-button';
	}

	async isVisible() {
		await TestHelpers.checkIfVisible(this.container);
	}

	async isNotVisible() {
		await TestHelpers.checkIfNotVisible(this.container);
	}
}
