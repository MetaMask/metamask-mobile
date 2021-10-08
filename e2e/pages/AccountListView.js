import TestHelpers from '../helpers';

const ACCOUNT_LIST_ID = 'account-list';
const CREATE_ACCOUNT_BUTTON_ID = 'create-account-button';

export default class AccountListView {
	static async tapCreateAccountButton() {
		await TestHelpers.waitAndTap(CREATE_ACCOUNT_BUTTON_ID);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(ACCOUNT_LIST_ID);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(ACCOUNT_LIST_ID);
	}

	static async isnewAccountNameVisible() {
		await TestHelpers.checkIfElementWithTextIsVisible('Account 2');
	}
}
