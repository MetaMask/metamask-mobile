import TestHelpers from '../../helpers';

const ACCOUNT_APROVAL_MODAL_CONTAINER_ID = 'account-approval-modal-container';
const CANCEL_BUTTON_ID = 'connect-cancel-button';
const CONNECT_BUTTON_ID = 'connect-approve-button';

export default class ConnectModal {
	static async tapCancelButton() {
		await TestHelpers.tap(CANCEL_BUTTON_ID);
	}

	static async tapConnectButton() {
		await TestHelpers.tap(CONNECT_BUTTON_ID);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(ACCOUNT_APROVAL_MODAL_CONTAINER_ID);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(ACCOUNT_APROVAL_MODAL_CONTAINER_ID);
	}
}
