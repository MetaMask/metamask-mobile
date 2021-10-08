import TestHelpers from '../helpers';

const REQUEST_PAYMENT_CONTAINER_ID = 'request-screen';
const REQUEST_ASSET_LIST_ID = 'searched-asset-results';
const TOKEN_SEARCH_INPUT_BOX = 'request-search-asset-input';
const BACK_BUTTON_ID = 'request-search-asset-back-button';

export default class RequestPaymentView {
	static async tapETH() {
		await TestHelpers.tapItemAtIndex(REQUEST_ASSET_LIST_ID);
	}
	static async tapBackButton() {
		await TestHelpers.tapItemAtIndex(BACK_BUTTON_ID);
	}

	static async searchForToken(token) {
		await TestHelpers.replaceTextInField(TOKEN_SEARCH_INPUT_BOX, token);
	}
	static async isVisible() {
		await TestHelpers.checkIfVisible(REQUEST_PAYMENT_CONTAINER_ID);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(REQUEST_PAYMENT_CONTAINER_ID);
	}
	static async isRequestTitleVisible() {
		await TestHelpers.checkIfElementWithTextIsVisible('Request');
	}
	static async isTokenVisibleInSearchResults(token) {
		await TestHelpers.checkIfElementHasString(REQUEST_ASSET_LIST_ID, token);
	}
}
