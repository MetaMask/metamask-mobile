import TestHelpers from '../helpers';

const container = 'wallet-screen';
const drawerButton = 'hamburger-menu-button-wallet';
const networksButton = 'open-networks-button';
const networkNameText = 'network-name';

export default class WalletView {
	static async tapDrawerButton() {
		await TestHelpers.tap(drawerButton);
	}

	static async tapNetworksButtonOnNavBar() {
		await TestHelpers.tap(networksButton);
	}

	static async isVisible() {
		if (!device.getPlatform() === 'android') {
			// Check that we are on the wallet screen
			await TestHelpers.checkIfExists(container);
		}
	}
	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(container);
	}

	static async isNetworkNameVisible(networkName) {
		await TestHelpers.checkIfElementHasString(networkNameText, networkName);
	}
}
