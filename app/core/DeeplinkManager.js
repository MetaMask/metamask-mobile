'use strict';

import URL from 'url-parse';

export default class DeeplinkManager {
	constructor(_navigation) {
		this.navigation = _navigation;
	}

	parse(url) {
		const urlObj = new URL(url);
		switch (urlObj.protocol.replace(':', '')) {
			// ethereum related deeplinks
			// address, transactions, etc
			case 'ethereum':
				// Check if it's an ethereum address
				if (urlObj.host.toLowerCase().substr(0, 2) === '0x') {
					this.navigation.navigate('TransferView', {
						to: urlObj.host
					});
				}

				break;

			// Specific to the browser screen
			// For ex. navigate to a specific dapp
			case 'dapp':
				this.navigation.navigate('Browser', { url: urlObj.host });
				break;

			// Specific to the MetaMask app
			// For ex. go to settings
			case 'metamask':
				break;
		}
	}
}
