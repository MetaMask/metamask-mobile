import TestHelpers from '../helpers';

const IMPORT_ACCOUNT_SCREEN_ID = 'import-account-screen';
const PRIVATE_KEY_INPUT_BOX_ID = 'input-private-key';
const IMPORT_BUTTON_ID = 'import-button';
const IMPORT_SUCESS_SCREEN_ID = 'import-success-screen';
const IMPORT_SUCESS_SCREEN_CLOSE_BUTTON_ID = 'import-close-button';

export default class ImportAccountView {
	static async tapImportButton() {
		await TestHelpers.waitAndTap(IMPORT_BUTTON_ID);
	}

	static async tapOKAlertButton() {
		await TestHelpers.tapAlertWithButton('OK');
	}

	static async enterPrivateKey(privateKey) {
		if (device.getPlatform() === 'android') {
			await TestHelpers.replaceTextInField(PRIVATE_KEY_INPUT_BOX_ID, privateKey);
			await element(by.id(PRIVATE_KEY_INPUT_BOX_ID)).tapReturnKey();
		} else {
			await TestHelpers.typeTextAndHideKeyboard(PRIVATE_KEY_INPUT_BOX_ID, privateKey);
		}
	}
	static async clearPrivateKeyInputBox() {
		await TestHelpers.clearField(PRIVATE_KEY_INPUT_BOX_ID);
	}

	// Closing import success view
	static async tapCloseButtonOnImportSuccess() {
		await TestHelpers.tap(IMPORT_SUCESS_SCREEN_CLOSE_BUTTON_ID);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(IMPORT_ACCOUNT_SCREEN_ID);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(IMPORT_ACCOUNT_SCREEN_ID);
	}

	static async isImportSuccessSreenVisible() {
		await TestHelpers.checkIfVisible(IMPORT_SUCESS_SCREEN_ID);
	}

	static async isnewAccountNameVisible() {
		await TestHelpers.checkIfElementWithTextIsVisible('Account 2');
	}
}
