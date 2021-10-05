import TestHelpers from '../helpers';
export default class Wallet {
	constructor() {
		this.container = 'onboarding-screen';
		this.createWalletButton = 'create-wallet-button';
		this.importUsingSecretRecoveryPhrase = 'import-wallet-import-from-seed-button';
		this.burgerMenuButton = 'hamburger-menu-button-wallet';
	}

	async isVisible() {
		if (!device.getPlatform() === 'android') {
			// Check that we are on the wallet screen
			await TestHelpers.checkIfExists('wallet-screen');
		}
	}

	async tapSendBurgerMenu() {
		await TestHelpers.tap(this.burgerMenuButton);
	}

	async isNotVisible() {
		await TestHelpers.checkIfNotVisible(this.container);
	}
}
