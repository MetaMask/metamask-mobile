'use strict';

import URL from 'url-parse';
import qs from 'qs';
import { InteractionManager, Alert } from 'react-native';
import { parse } from 'eth-url-parser';
import WalletConnect from '../core/WalletConnect';
import PaymentChannelsClient from '../core/PaymentChannelsClient';
import AppConstants from './AppConstants';

class DeeplinkManager {
	constructor(_navigation) {
		this.navigation = _navigation;
	}

	handleEthereumUrl(url) {
		let action;
		const ethUrl = parse(url);
		action = 'send-eth';
		if (ethUrl.function_name === 'transfer') {
			// Send erc20 token
			action = 'send-token';
		} else if (ethUrl.function_name) {
			// Other smart contract interaction
			// That involves txs
			action = 'smart-contract-interaction';
		}
		this.navigation.navigate('SendView', {
			txMeta: { ...ethUrl, action, source: url }
		});
	}

	handleBrowserUrl(url, callback) {
		this.navigation.navigate('BrowserTabHome');
		InteractionManager.runAfterInteractions(() => {
			if (callback) {
				callback(url);
			} else {
				this.navigation.navigate('BrowserView', {
					newTabUrl: url
				});
			}
		});
	}

	handlePaymentChannelsUrl(to, params) {
		setTimeout(() => {
			PaymentChannelsClient.hub.emit('payment::request', {
				to,
				...params
			});
		}, 1000);
	}

	parse(url, browserCallBack = null) {
		const urlObj = new URL(url);
		let params;

		if (urlObj.query.length) {
			params = qs.parse(urlObj.query.substring(1));
		}
		const { MM_UNIVERSAL_LINK_HOST } = AppConstants;

		switch (urlObj.protocol.replace(':', '')) {
			case 'http':
			case 'https':
				// Universal links
				if (urlObj.hostname === MM_UNIVERSAL_LINK_HOST) {
					// action is the first parth of the pathname
					const action = urlObj.pathname.split('/')[1];

					switch (action) {
						case 'wc':
							if (params && params.uri && params.redirectUrl) {
								setTimeout(() => {
									WalletConnect.newSession(params.uri, params.redirectUrl, false);
								}, 1500);
							}
							break;
						case 'dapp':
							this.handleBrowserUrl(
								urlObj.href.replace(`https://${MM_UNIVERSAL_LINK_HOST}/dapp/`, 'https://'),
								browserCallBack
							);
							break;
						case 'send':
							this.handleEthereumUrl(
								urlObj.href.replace(`https://${MM_UNIVERSAL_LINK_HOST}/send/`, 'ethereum:')
							);
							break;
						case 'payment':
							this.handlePaymentChannelsUrl(urlObj.pathname.replace('/payment/', ''), params);
							break;
						case 'focus':
						case '':
							break;

						default:
							Alert.alert('Error', 'invalid deeplink');
					}
				} else {
					// Normal links (same as dapp)
					urlObj.set('protocol', 'https:');
					this.handleBrowserUrl(urlObj.href, browserCallBack);
				}
				break;

			// walletconnect related deeplinks
			// address, transactions, etc
			case 'wc':
				// eslint-disable-next-line no-case-declarations
				const redirect = params && params.redirect;
				// eslint-disable-next-line no-case-declarations
				const autosign = params && params.autosign;
				WalletConnect.newSession(url, redirect, autosign);
				break;
			case 'ethereum':
				this.handleEthereumUrl(url);

				break;

			// Specific to the browser screen
			// For ex. navigate to a specific dapp
			case 'dapp':
				// Enforce https
				urlObj.set('protocol', 'https:');
				this.handleBrowserUrl(urlObj.href, browserCallBack);
				break;

			// Specific to the MetaMask app
			// For ex. go to settings
			case 'metamask':
				if (urlObj.hostname === 'payment') {
					this.handlePaymentChannelsUrl(urlObj.pathname.replace('/', ''), params);
				}
				break;
		}
	}
}

let instance = null;
let pendingDeeplink = null;

const SharedDeeplinkManager = {
	init: navigation => {
		instance = new DeeplinkManager(navigation);
	},
	parse: (url, browserCallback) => instance.parse(url, browserCallback),
	setDeeplink: url => {
		pendingDeeplink = url;
	},
	getPendingDeeplink: () => pendingDeeplink,
	expireDeeplink: () => {
		pendingDeeplink = null;
	}
};

export default SharedDeeplinkManager;
