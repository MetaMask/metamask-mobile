import TestHelpers from '../../helpers';

const DRAWER_CONTAINER_ID = 'drawer-screen';
const SEND_BUTTON_ID = 'drawer-send-button';

export default class DrawerView {
	static async tapBrowser() {
		await TestHelpers.tapByText('Browser');
		await TestHelpers.delay(1000);
	}

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
		await TestHelpers.tap(SEND_BUTTON_ID);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(DRAWER_CONTAINER_ID);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(DRAWER_CONTAINER_ID);
	}
}
