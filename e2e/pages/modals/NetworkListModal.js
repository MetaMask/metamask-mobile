import TestHelpers from '../../helpers';

const container = 'networks-list';
const otherNetworksList = 'other-network-name';
const otherNetworksScroll = 'other-networks-scroll';
export default class NetworkListModal {
	static async changeNetwork(networkName) {
		await TestHelpers.tapByText(networkName);
	}

	static async scrollToBottomOfNetworkList() {
		await TestHelpers.swipe(otherNetworksScroll, 'up', 'fast');
		await TestHelpers.delay(1000);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(container);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(container);
	}

	static async isNetworkNameVisibleInListOfNetworks(networkName) {
		await TestHelpers.checkIfElementHasString(otherNetworksList, networkName);
	}
}
