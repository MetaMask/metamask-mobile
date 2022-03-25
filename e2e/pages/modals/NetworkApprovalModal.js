import TestHelpers from '../../helpers';
import {
	APPROVE_NETWORK_DISPLAY_NAME_ID,
	APPROVE_NETWORK_MODAL_ID,
	APPROVE_NETWORK_CANCEL_BUTTON_ID,
	APPROVE_NETWORK_APPROVE_BUTTON_ID,
} from '../../../app/constants/test-ids';
import { strings } from '../../../locales/i18n';

const switchToNetwork = strings('networks.switch_network');
const closeNetworks = strings('networks.close');
export default class NetworkApprovalModal {
	static async tapApproveButton() {
		await TestHelpers.tap(APPROVE_NETWORK_APPROVE_BUTTON_ID);
	}

	static async tapCanelButton() {
		await TestHelpers.tap(APPROVE_NETWORK_CANCEL_BUTTON_ID);
	}

	static async tapSwitchToNetwork() {
		await TestHelpers.tapByText(switchToNetwork);
	}
	static async tapClose() {
		await TestHelpers.tapByText(closeNetworks);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(APPROVE_NETWORK_MODAL_ID);
	}
	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(APPROVE_NETWORK_MODAL_ID);
	}

	static async isDisplayNameVisible(displayName) {
		await TestHelpers.checkIfHasText(APPROVE_NETWORK_DISPLAY_NAME_ID, displayName);
	}

	static async isChainIDVisible(chainID) {
		await TestHelpers.checkIfElementWithTextIsVisible(chainID);
	}

	static async isNetworkURLVisible(networkURL) {
		await TestHelpers.checkIfElementWithTextIsVisible(networkURL);
	}
}
