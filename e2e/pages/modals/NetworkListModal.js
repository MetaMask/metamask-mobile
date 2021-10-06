import TestHelpers from '../../helpers';

const NETWORK_LIST_MODAL_CONTAINER_ID = 'networks-list';
const OTHER_NETWORK_LIST_ID = 'other-network-name';
const NETWORK_SCROLL_ID = 'other-networks-scroll';
export default class NetworkListModal {
	static async changeNetwork(networkName) {
		await TestHelpers.tapByText(networkName);
	}

	static async scrollToBottomOfNetworkList() {
		await TestHelpers.swipe(NETWORK_SCROLL_ID, 'up', 'fast');
		await TestHelpers.delay(1000);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(NETWORK_LIST_MODAL_CONTAINER_ID);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(NETWORK_LIST_MODAL_CONTAINER_ID);
	}

	static async isNetworkNameVisibleInListOfNetworks(networkName) {
		await TestHelpers.checkIfElementHasString(OTHER_NETWORK_LIST_ID, networkName);
	}
}
