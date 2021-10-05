import TestHelpers from '../../helpers';

const container = 'backup-alert';
const remindMeLaterButton = 'notification-remind-later-button';
export default class ProtectYourWalletModal {
	static async tapRemindMeLaterButton() {
		await TestHelpers.tap(remindMeLaterButton);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(container);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(container);
	}
}
