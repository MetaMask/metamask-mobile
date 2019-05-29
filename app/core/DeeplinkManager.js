'use strict';

import URL from 'url-parse';
import qs from 'qs';
import { parse } from 'eth-url-parser';
import WalletConnect from '../core/WalletConnect';
import PaymentChannelsClient from '../core/PaymentChannelsClient';

export default class DeeplinkManager {
	constructor(_navigation) {
		this.navigation = _navigation;
	}

	parse(url) {
		const urlObj = new URL(url);
		let ethUrl, action, params;

		if (urlObj.query.length) {
			params = qs.parse(urlObj.query.substring(1));
		}

		switch (urlObj.protocol.replace(':', '')) {
			// walletconnect related deeplinks
			// address, transactions, etc
			case 'wc':
				// eslint-disable-next-line no-case-declarations
				const redirect = params && params.redirect;
				// eslint-disable-next-line no-case-declarations
				const autosign = params && params.autosign;

				if (urlObj.hostname === 'sign' || urlObj.hostname === 'send') {
					WalletConnect.setRedirectUri(redirect);
				} else {
					WalletConnect.newSession(url, redirect, autosign);
				}
				break;
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
				this.navigation.navigate('SendView', { txMeta: { ...ethUrl, action, source: url } });

				break;

			// Specific to the browser screen
			// For ex. navigate to a specific dapp
			case 'dapp':
				// Enforce https
				urlObj.set('protocol', 'https:');

				this.navigation.navigate('BrowserView', {
					url: urlObj.href
				});
				break;

			// Specific to the MetaMask app
			// For ex. go to settings
			case 'metamask':
				if (urlObj.hostname === 'payment') {
					PaymentChannelsClient.hub.emit('payment::request', {
						to: urlObj.pathname.replace('/', ''),
						...params
					});
				}
				break;
		}
	}
}
