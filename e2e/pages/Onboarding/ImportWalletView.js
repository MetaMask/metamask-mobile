import TestHelpers from '../../helpers';
import { strings } from '../../../locales/i18n';

const IMPORT_PASSWORD_CONTAINER_ID = 'import-from-seed-screen';
const SECRET_RECOVERY_PHRASE_INPUT_BOX_ID = 'input-seed-phrase';
const CREATE_PASSWORD_INPUT_BOX_ID = 'input-password-field';
const CONFIRM_PASSWORD_INPUT_BOX_ID = 'input-password-field-confirm';
const IOS_I_UNDERSTAND_BUTTON_ID = 'password-understand-box';
const ANDROID_I_UNDERSTAND_BUTTON_ID = 'i-understand-text';
const CREATE_PASSWORD_BUTTON_ID = 'submit-button';

// use i18n for these
// this way if the strings ever change the tests will not break :)
const Incorrect_Password_Length = strings('import_from_seed.password_length_error');
const Invalid_Seed_Error = strings('import_from_seed.invalid_seed_phrase');

export default class ImportWalletView {
	static async enterPassword(password) {
		await TestHelpers.typeTextAndHideKeyboard(CREATE_PASSWORD_INPUT_BOX_ID, password);
	}

	static async reEnterPassword(password) {
		await TestHelpers.typeTextAndHideKeyboard(CONFIRM_PASSWORD_INPUT_BOX_ID, password);
	}

	static async tapIUnderstandCheckBox() {
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap(IOS_I_UNDERSTAND_BUTTON_ID);
		} else {
			// Tap by the I understand text
			await TestHelpers.delay(1000);
			await TestHelpers.tap(ANDROID_I_UNDERSTAND_BUTTON_ID);
		}
	}

	static async tapCreatePasswordButton() {
		await TestHelpers.tap(CREATE_PASSWORD_BUTTON_ID);
	}

	static async tapOKAlertButton() {
		await TestHelpers.tapAlertWithButton('OK');
	}

	static async enterSecretRecoveryPhrase(secretRecoveryPhrase) {
		if (device.getPlatform() === 'android') {
			await TestHelpers.replaceTextInField(SECRET_RECOVERY_PHRASE_INPUT_BOX_ID, secretRecoveryPhrase);
			await element(by.id(SECRET_RECOVERY_PHRASE_INPUT_BOX_ID)).tapReturnKey();
		} else {
			await TestHelpers.typeTextAndHideKeyboard(SECRET_RECOVERY_PHRASE_INPUT_BOX_ID, secretRecoveryPhrase);
		}
	}
	static async clearSecretRecoveryPhraseInputBox() {
		await TestHelpers.clearField(SECRET_RECOVERY_PHRASE_INPUT_BOX_ID);
	}

	// Assertions
	static async isVisible() {
		await TestHelpers.checkIfVisible(IMPORT_PASSWORD_CONTAINER_ID);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(IMPORT_PASSWORD_CONTAINER_ID);
	}

	static async secretRecoveryPhraseErrorIsVisible() {
		await TestHelpers.checkIfElementByTextIsVisible(Invalid_Seed_Error);
	}
	static async passwordLengthErrorIsVisible() {
		await TestHelpers.checkIfElementByTextIsVisible(Incorrect_Password_Length);
	}
}
