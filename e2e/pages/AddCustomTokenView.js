import TestHelpers from '../helpers';

const CUSTOM_TOKEN_CONTAINER_ID = 'add-custom-token-screen';
const TOKEN_ADDRESS_INPUT_BOX_ID = 'input-token-address';
const TOKEN_ADDRESS_SYMBOL_ID = 'input-token-symbol';

const NFT_ADDRESS_INPUT_BOX_ID = 'input-collectible-address';
const NFT_ADDRESS_WARNING_MESSAGE_ID = 'collectible-address-warning';
const NFT_IDENTIFIER_WARNING_MESSAGE_ID = 'collectible-identifier-warning';

const TOKEN_ADDRESS_WARNING_MESSAGE_ID = 'token-address-warning';
const TOKEN_SYMBOL_WARNING_MESSAGE_ID = 'token-decimals-warning';
const BACK_BUTTON_ID = 'asset-back-button';
const NFT_IDENTIFIER_INPUT_BOX_ID = 'input-token-decimals';
const TOKEN_IMPORT_BUTTON_ID = 'add-custom-asset-confirm-button';

export default class AddCustomTokenView {
	static async tapImportButton() {
		await TestHelpers.tapByText('IMPORT');
	}

	static async tapCustomTokenTab() {
		await TestHelpers.tapByText('CUSTOM TOKEN');
	}
	static async tapCustomTokenImportButton() {
		await TestHelpers.delay(1500);
		await TestHelpers.tap(TOKEN_IMPORT_BUTTON_ID);
	}

	static async tapBackButton() {
		if (device.getPlatform() === 'android') {
			await device.pressBack();
		} else {
			await TestHelpers.tap(BACK_BUTTON_ID);
		}
	}
	static async tapTokenSymbolText() {
		await TestHelpers.tapByText('Token Address');
	}

	static async typeTokenAddress(address) {
		if (device.getPlatform() === 'android') {
			await TestHelpers.replaceTextInField(TOKEN_ADDRESS_INPUT_BOX_ID, address);
			await element(by.id(TOKEN_ADDRESS_INPUT_BOX_ID)).tapReturnKey();
		} else {
			await TestHelpers.typeText(TOKEN_ADDRESS_INPUT_BOX_ID, address);
		}
	}

	static async typeTokenSymbol(symbol) {
		await TestHelpers.typeTextAndHideKeyboard(TOKEN_ADDRESS_SYMBOL_ID, symbol);
	}

	static async typeInNFTAddress(address) {
		if (device.getPlatform() === 'android') {
			await TestHelpers.replaceTextInField(NFT_ADDRESS_INPUT_BOX_ID, address);
			await element(by.id(NFT_ADDRESS_INPUT_BOX_ID)).tapReturnKey();
		} else {
			await TestHelpers.typeTextAndHideKeyboard(NFT_ADDRESS_INPUT_BOX_ID, address);
		}
	}
	static async typeInNFTIdentifier(identifier) {
		if (device.getPlatform() === 'android') {
			await TestHelpers.replaceTextInField(NFT_IDENTIFIER_INPUT_BOX_ID, identifier);
			await element(by.id(NFT_IDENTIFIER_INPUT_BOX_ID)).tapReturnKey();
		} else {
			await TestHelpers.typeTextAndHideKeyboard(NFT_IDENTIFIER_INPUT_BOX_ID, identifier);
		}
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(CUSTOM_TOKEN_CONTAINER_ID);
	}

	static async isNFTAddressWarningVisible() {
		await TestHelpers.checkIfVisible(NFT_ADDRESS_WARNING_MESSAGE_ID);
	}
	static async isNFTIdentifierWarningVisible() {
		await TestHelpers.checkIfVisible(NFT_IDENTIFIER_WARNING_MESSAGE_ID);
	}

	static async isTokenAddressWarningVisible() {
		await TestHelpers.checkIfVisible(TOKEN_ADDRESS_WARNING_MESSAGE_ID);
	}
	static async isTokenSymbolWarningVisible() {
		await TestHelpers.checkIfVisible(TOKEN_SYMBOL_WARNING_MESSAGE_ID);
	}
}
