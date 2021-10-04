import TestHelpers from '../helpers';

export default class CreatePassword {
	constructor() {
		this.container = 'create-password-screen';
		this.passwordInputBox = 'input-password';
		this.confirmpasswordInputBox = 'input-password-confirm';
		this.iosIUnderstandButton = 'password-understand-box';
		this.androidIUnderstandButton = 'i-understand-text';
		this.createPasswordButton = 'submit-button';
	}

	async enterPassword(password) {
		await TestHelpers.typeTextAndHideKeyboard(this.passwordInputBox, password);
	}

	async reEnterPassword(password) {
		await TestHelpers.typeTextAndHideKeyboard(this.confirmpasswordInputBox, password);
	}

	async tapIUnderstandCheckBox() {
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap(this.iosIUnderstandButton);
		} else {
			// Tap by the I understand text
			await TestHelpers.delay(1000);
			await TestHelpers.tap(this.androidIUnderstandButton);
		}
	}

	async tapCreatePasswordButton() {
		await TestHelpers.tap(this.createPasswordButton);
	}

	// Assertions
	async isVisible() {
		await TestHelpers.checkIfVisible(this.container);
	}

	async isNotVisible() {
		await TestHelpers.checkIfNotVisible(this.container);
	}
}
