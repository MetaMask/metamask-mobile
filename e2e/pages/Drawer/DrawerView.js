import TestHelpers from '../../helpers';

export default class DrawerView {
	constructor() {
		this.container = 'drawer-screen';
		//this.settingsButton = 'Settings';
		this.sendButton = 'drawer-send-button';
	}

	async tapSettingsButton() {
		await TestHelpers.tapByText('Settings');
	}
	async tapSendButton() {
		await TestHelpers.tap(this.sendButton);
	}
}
