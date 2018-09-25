'use strict';

import URL from 'url-parse';
import { parse } from 'eth-url-parser';
export default class DeeplinkManager {
	constructor(_navigation) {
		this.navigation = _navigation;
	}

	parse(url) {
		const urlObj = new URL(url);
		let ethUrl, action;
		switch (urlObj.protocol.replace(':', '')) {
			// ethereum related deeplinks
			// address, transactions, etc
			case 'ethereum':
				ethUrl = parse(url);
				action = 'send-eth';
				if (ethUrl.function_name === 'transfer') {
					// Send erc20 token
					action = 'send-token';
				} else if (ethUrl.function_name) {
					// Other smart contract interaction
					// That involves txs
					action = 'smart-contract-interaction';
				}

				this.navigation.navigate('TransferView', { txMeta: { ...ethUrl, action, source: url } });

				break;

			// Specific to the browser screen
			// For ex. navigate to a specific dapp
			case 'dapp':

				// if ?secure=false then default to http
				if(urlObj.query && urlObj.query.secure === "false"){
					urlObj.set('protocol', 'http:');
				} else {
					urlObj.set('protocol', 'https:');
				}
				
				this.navigation.navigate('BrowserView', {
					url: urlObj.href
				});
				break;

			// Specific to the MetaMask app
			// For ex. go to settings
			case 'metamask':
				break;
		}
	}
}
