import TestHelpers from '../../helpers';

const container = 'drawer-screen';
//this.settingsButton = 'Settings';
const sendButton = 'drawer-send-button';

export default class DrawerView {
	static async tapSettings() {
		await TestHelpers.tapByText('Settings');
	}

	static async tapTransactions() {
		await TestHelpers.tapByText('Transactions');
	}
	static async tapLogOut() {
		await TestHelpers.tapByText('Log Out');
	}

	static async tapSendButton() {
		await TestHelpers.tap(sendButton);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(container);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(container);
	}
}
