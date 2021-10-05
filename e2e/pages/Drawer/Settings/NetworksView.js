import TestHelpers from '../../../helpers';

const networkViewContainer = 'networks-screen';
const rpcViewContainer = 'new-rpc-screen';
const addNetworkButton = 'add-network-button';
const rpcNetworkName = 'rpc-networks';

const rpcTitleText = 'rpc-screen-title';
const networkNameInputBox = 'input-network-name';
const rPCUrlInputBox = 'input-rpc-url';
const chainIDInputBox = 'input-chain-id';
const networkSymbolInputBox = 'input-network-symbol';
const rpcWarningBanner = 'rpc-url-warning';
const addButton = 'network-add-button';

export default class NetworkView {
	static async tapAddNetworkButton() {
		await TestHelpers.tap(addNetworkButton);
	}

	static async tapNetworks() {
		await TestHelpers.tapByText('Networks');
	}
	static async typeInNetworkName(networkName) {
		await TestHelpers.typeTextAndHideKeyboard(networkNameInputBox, networkName);
	}
	static async typeInRpcUrl(rPCUrl) {
		await TestHelpers.typeTextAndHideKeyboard(rPCUrlInputBox, rPCUrl);
	}
	static async typeInChainId(chainID) {
		await TestHelpers.typeTextAndHideKeyboard(chainIDInputBox, chainID);
	}
	static async typeInNetworkSymbol(networkSymbol) {
		await TestHelpers.typeTextAndHideKeyboard(networkSymbolInputBox, networkSymbol);
	}

	static async clearRpcInputBox() {
		await TestHelpers.clearField(rPCUrlInputBox);
	}

	static async tapRpcNetworkAddButton() {
		await TestHelpers.tap(addButton);
	}

	static async swipeToRPCTitleAndDismissKeyboard() {
		// Because in bitrise the keyboard is blocking the "Add" CTA

		await TestHelpers.swipe(rPCUrlInputBox, 'down', 'fast');
		await TestHelpers.tap(rpcTitleText);
		await TestHelpers.delay(3000);
	}

	static async removeNetwork() {
		await TestHelpers.tapAndLongPressAtIndex(rpcNetworkName, 0);
		//Remove xDAI and verify removed on wallet view
		//Tap remove
		await TestHelpers.tapByText('Remove');
	}
	static async tapBackButtonAndReturnToWallet() {
		// Go back to wallet screen
		if (device.getPlatform() === 'ios') {
			// Tap on back arrow
			await TestHelpers.tap('nav-ios-back');
			// Tap close
			await TestHelpers.tapByText('Close');
		} else {
			// Go Back for android
			await TestHelpers.tap('nav-android-back');
			await TestHelpers.tap('nav-android-back');
		}
	}

	static async isNetworkViewVisible() {
		await TestHelpers.checkIfVisible(networkViewContainer);
	}

	static async networkViewNotVisible() {
		await TestHelpers.checkIfNotVisible(networkViewContainer);
	}

	static async isRpcViewVisible() {
		await TestHelpers.checkIfVisible(rpcViewContainer);
	}

	static async RpcViewNotVisible() {
		await TestHelpers.checkIfNotVisible(rpcViewContainer);
	}

	static async isRPCWarningVisble() {
		await TestHelpers.checkIfVisible(rpcWarningBanner);
	}
}
