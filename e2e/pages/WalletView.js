import TestHelpers from '../helpers';

const WALLET_CONTAINER_ID = 'wallet-screen';
const DRAWER_BUTTON_ID = 'hamburger-menu-button-wallet';
const NETWORKS_BUTTON_ID = 'open-networks-button';
const NETWORK_NAME_TEXT_ID = 'network-name';

export default class WalletView {
	static async tapDrawerButton() {
		await TestHelpers.tap(DRAWER_BUTTON_ID);
	}

	static async tapNetworksButtonOnNavBar() {
		await TestHelpers.tap(NETWORKS_BUTTON_ID);
	}

	static async isVisible() {
		if (!device.getPlatform() === 'android') {
			// Check that we are on the wallet screen
			await TestHelpers.checkIfExists(WALLET_CONTAINER_ID);
		}
	}
	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(WALLET_CONTAINER_ID);
	}

	static async isNetworkNameVisible(networkName) {
		await TestHelpers.checkIfElementHasString(NETWORK_NAME_TEXT_ID, networkName);
	}
}
