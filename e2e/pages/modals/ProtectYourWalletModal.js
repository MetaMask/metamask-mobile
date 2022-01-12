import TestHelpers from '../../helpers';

const PROTECT_YOUR_WALLET_MODAL_CONTAINER_ID = 'protect-wallet-modal';
const COLLAPSED_PROTECT_YOUR_WALLET_MODAL_CONTAINER_ID = 'backup-alert';
const REMIND_ME_LATER_BUTTON_ID = 'notification-remind-later-button';
export default class ProtectYourWalletModal {
	static async tapRemindMeLaterButton() {
		await TestHelpers.tap(REMIND_ME_LATER_BUTTON_ID);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(PROTECT_YOUR_WALLET_MODAL_CONTAINER_ID);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(PROTECT_YOUR_WALLET_MODAL_CONTAINER_ID);
	}

	static async isCollapsedBackUpYourWalletModalVisible() {
		await TestHelpers.checkIfVisible(COLLAPSED_PROTECT_YOUR_WALLET_MODAL_CONTAINER_ID);
	}

	static async isCollapsedBackUpYourWalletModalNotVisible() {
		await TestHelpers.checkIfNotVisible(COLLAPSED_PROTECT_YOUR_WALLET_MODAL_CONTAINER_ID);
	}
}
