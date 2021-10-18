import TestHelpers from '../helpers';

const CUSTOM_TOKEN_CONTAINER_ID = 'add-custom-token-screen';
const TOKEN_INPUT_BOX_ID = 'input-search-asset';
const NFT_BACK_BUTTON = 'asset-back-button';
const TOKEN_RESULTS_LIST_ID = 'searched-token-result';

export default class ImportTokensView {
	static async tapImportButton() {
		await TestHelpers.tapByText('IMPORT');
	}
	static async tapBackButton() {
		await TestHelpers.tap(NFT_BACK_BUTTON);
	}

	static async typeInTokenName(tokenName) {
		await TestHelpers.typeTextAndHideKeyboard(TOKEN_INPUT_BOX_ID, tokenName);
	}
	static async tapOnToken() {
		await TestHelpers.tapItemAtIndex(TOKEN_RESULTS_LIST_ID);
	}
	static async tapOnImportButton() {
		await TestHelpers.tapByText('IMPORT');
	}
	static async isVisible() {
		await TestHelpers.checkIfVisible(CUSTOM_TOKEN_CONTAINER_ID);
	}
}
