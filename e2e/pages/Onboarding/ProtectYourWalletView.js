import TestHelpers from '../../helpers';

const container = 'protect-your-account-screen';
const remindMeLaterButton = 'remind-me-later-button';
export default class ProtectYourWalletView {
	static async tapOnRemindMeLaterButton() {
		await TestHelpers.tap(remindMeLaterButton);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(container);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(container);
	}
}
