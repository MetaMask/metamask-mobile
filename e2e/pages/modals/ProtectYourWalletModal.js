import TestHelpers from '../../helpers';

export default class ProtectYourWalletModal {
	constructor() {
		this.container = 'backup-alert';
		this.remindMeLaterButton = 'notification-remind-later-button';
	}

	async tapRemindMeLaterButton() {
		await TestHelpers.tap(this.remindMeLaterButton);
	}
}
