import TestHelpers from '../helpers';

const ACCOUNT_LIST_ID = 'account-list';
const CREATE_ACCOUNT_BUTTON_ID = 'create-account-button';
const IMPORT_ACCOUNT_BUTTON_ID = 'import-account-button';

export default class AccountListView {
	static async tapCreateAccountButton() {
		await TestHelpers.waitAndTap(CREATE_ACCOUNT_BUTTON_ID);
	}

	static async tapImportAccountButton() {
		await TestHelpers.waitAndTap(IMPORT_ACCOUNT_BUTTON_ID);
	}

	static async tapAccountByName(accountName) {
		await TestHelpers.tapByText(accountName);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(ACCOUNT_LIST_ID);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(ACCOUNT_LIST_ID);
	}

	static async isNewAccountNameVisible() {
		if (device.getPlatform() === 'android') {
			await TestHelpers.checkIfElementWithTextIsVisible('Account 2');
		}
	}
}
