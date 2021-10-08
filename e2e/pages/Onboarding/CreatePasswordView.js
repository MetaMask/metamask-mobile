import TestHelpers from '../../helpers';

const CREATE_PASSWORD_CONTAINER_ID = 'create-password-screen';
const CREATE_PASSWORD_INPUT_BOX_ID = 'input-password';
const CONFIRM_PASSWORD_INPUT_BOX_ID = 'input-password-confirm';
const IOS_I_UNDERSTAND_BUTTON_ID = 'password-understand-box';
const ANDROID_I_UNDERSTAND_BUTTON_ID = 'i-understand-text';
const CREATE_PASSWORD_BUTTON_ID = 'submit-button';
export default class CreatePasswordView {
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

	// Assertions
	static async isVisible() {
		await TestHelpers.checkIfVisible(CREATE_PASSWORD_CONTAINER_ID);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(CREATE_PASSWORD_CONTAINER_ID);
	}
}
