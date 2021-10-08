import TestHelpers from '../helpers';

const WALLET_CONTAINER_ID = 'wallet-screen';
const DRAWER_BUTTON_ID = 'hamburger-menu-button-wallet';
const NETWORKS_BUTTON_ID = 'open-networks-button';
const NETWORK_NAME_TEXT_ID = 'network-name';
const EDIT_ACCOUNT_TEXT_ID = 'edit-account-label';
const ACCOUNT_NAME_TEXT_ID = 'account-label-text-input';
const IDENTICON_ID = 'wallet-account-identicon';
export default class WalletView {
	static async tapIdenticon() {
		await TestHelpers.tap(IDENTICON_ID);
	}

	static async tapDrawerButton() {
		await TestHelpers.tap(DRAWER_BUTTON_ID);
	}

	static async tapNetworksButtonOnNavBar() {
		await TestHelpers.waitAndTap(NETWORKS_BUTTON_ID);
	}
	static async tapNFTButton() {
		await TestHelpers.tapByText('NFTs');
	}

	static async editAccountName(accountName) {
		// For now this method only works for android.
		if (device.getPlatform() === 'android') {
			await TestHelpers.tapAndLongPress(EDIT_ACCOUNT_TEXT_ID);
			// Clear text
			await TestHelpers.clearField(ACCOUNT_NAME_TEXT_ID);
			// Change account name
			await TestHelpers.replaceTextInField(ACCOUNT_NAME_TEXT_ID, accountName);
			await element(by.id(ACCOUNT_NAME_TEXT_ID)).tapReturnKey();
		}
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

	static async isAccountNameCorrect(accountName) {
		await TestHelpers.checkIfElementHasString(ACCOUNT_NAME_TEXT_ID, accountName);
	}
	static async isAccountBalanceCorrect(accountBalance) {
		await TestHelpers.checkIfElementHasString('balance', accountBalance);
	}
}
