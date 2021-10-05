import TestHelpers from '../../helpers';

const container = 'create-password-screen';
const passwordInputBox = 'input-password';
const confirmpasswordInputBox = 'input-password-confirm';
const iosIUnderstandButton = 'password-understand-box';
const androidIUnderstandButton = 'i-understand-text';
const createPasswordButton = 'submit-button';
export default class CreatePasswordView {
	static async enterPassword(password) {
		await TestHelpers.typeTextAndHideKeyboard(passwordInputBox, password);
	}

	static async reEnterPassword(password) {
		await TestHelpers.typeTextAndHideKeyboard(confirmpasswordInputBox, password);
	}

	static async tapIUnderstandCheckBox() {
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap(iosIUnderstandButton);
		} else {
			// Tap by the I understand text
			await TestHelpers.delay(1000);
			await TestHelpers.tap(androidIUnderstandButton);
		}
	}

	static async tapCreatePasswordButton() {
		await TestHelpers.tap(createPasswordButton);
	}

	// Assertions
	static async isVisible() {
		await TestHelpers.checkIfVisible(container);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(container);
	}
}
