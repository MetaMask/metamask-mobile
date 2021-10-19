import TestHelpers from '../helpers';

const LOGIN_CONTAINER_ID = 'login';
const PASSWORD_INPUT_BOX_ID = 'login-password-input';
const LOGIN_PASSWORD_ERROR = 'invalid-password-error';

export default class LoginView {
	static async enterPassword(password) {
		await TestHelpers.typeTextAndHideKeyboard(PASSWORD_INPUT_BOX_ID, password);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(LOGIN_CONTAINER_ID);
	}
	static async isLoginErrorVisible() {
		await TestHelpers.checkIfVisible(LOGIN_PASSWORD_ERROR);
	}
}
