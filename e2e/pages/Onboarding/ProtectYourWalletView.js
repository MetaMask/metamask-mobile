import TestHelpers from '../../helpers';

export default class ProtectYourWalletView {
	constructor() {
		this.container = 'protect-your-account-screen';
		this.remindMeLaterButton = 'remind-me-later-button';
	}

	async tapOnRemindMeLaterButton() {
		await TestHelpers.tap(this.remindMeLaterButton);
	}
}
