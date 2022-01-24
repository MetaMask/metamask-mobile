'use strict';

import URL from 'url-parse';
import qs from 'qs';
import { InteractionManager, Alert } from 'react-native';
import { parse } from 'eth-url-parser';
import WalletConnect from '../core/WalletConnect';
import AppConstants from './AppConstants';
import Engine from './Engine';
import { generateApproveData } from '../util/transactions';
import { strings } from '../../locales/i18n';
import { getNetworkTypeById } from '../util/networks';
import { WalletDevice } from '@metamask/controllers/';
import { ACTIONS, ETH_ACTIONS, PROTOCOLS, PREFIXES } from '../constants/deeplinks';

class DeeplinkManager {
	constructor(_navigation) {
		this.navigation = _navigation;
		this.pendingDeeplink = null;
	}

	setDeeplink = (url) => (this.pendingDeeplink = url);

	getPendingDeeplink = () => this.pendingDeeplink;

	expireDeeplink = () => (this.pendingDeeplink = null);

	approveTransaction = (ethUrl, origin) => {
		const {
			parameters: { address, uint256 },
			target_address,
			chain_id,
		} = ethUrl;
		const { TransactionController, PreferencesController, NetworkController } = Engine.context;

		if (chain_id) {
			const newNetworkType = getNetworkTypeById(chain_id);
			NetworkController.setProviderType(newNetworkType);
		}

		const txParams = {
			to: `${target_address}`,
			from: `${PreferencesController.state.selectedAddress}`,
			value: '0x0',
		};
		const uint256Number = Number(uint256);

		if (Number.isNaN(uint256Number)) throw new Error('The parameter uint256 should be a number');
		if (!Number.isInteger(uint256Number)) throw new Error('The parameter uint256 should be an integer');

		const value = uint256Number.toString(16);

		txParams.data = generateApproveData({ spender: address, value });
		TransactionController.addTransaction(txParams, origin, WalletDevice.MM_MOBILE);
	};

	async handleEthereumUrl(url, origin) {
		let ethUrl = '';

		try {
			ethUrl = parse(url);
		} catch (e) {
			Alert.alert(strings('deeplink.invalid'), e.toString());
			return;
		}

		const txMeta = { ...ethUrl, source: url };

		switch (ethUrl.function_name) {
			case ETH_ACTIONS.TRANSFER: {
				this.navigation.navigate('SendView', {
					screen: 'Send',
					params: { txMeta: { ...txMeta, action: 'send-token' } },
				});
				break;
			}
			case ETH_ACTIONS.APPROVE: {
				this.approveTransaction(ethUrl, origin);
				break;
			}
			default: {
				if (ethUrl.parameters?.value) {
					this.navigation.navigate('SendView', {
						screen: 'Send',
						params: { txMeta: { ...txMeta, action: 'send-eth' } },
					});
				} else {
					this.navigation.navigate('SendFlowView', { screen: 'SendTo', params: { txMeta } });
				}
			}
		}
	}

	handleBrowserUrl(url, callback) {
		this.navigation.navigate('BrowserTabHome');

		InteractionManager.runAfterInteractions(() => {
			if (callback) {
				callback(url);
			} else {
				this.navigation.navigate('BrowserTabHome', {
					screen: 'BrowserView',
					params: {
						newTabUrl: url,
						timestamp: Date.now(),
					},
				});
			}
		});
	}

	parse(url, { browserCallBack, origin, onHandled }) {
		const urlObj = new URL(url.replace('https://', '').replace('http://', ''));
		let params;
		let wcCleanUrl;

		if (urlObj.query) {
			try {
				params = qs.parse(urlObj.query.substring(1));
			} catch (e) {
				Alert.alert(strings('deeplink.invalid'), e.toString());
				//TODO: check if we have to return false here
			}
		}

		const handled = () => onHandled?.() || false;
		const { MM_UNIVERSAL_LINK_HOST } = AppConstants;

		switch (urlObj.protocol.replace(':', '')) {
			case PROTOCOLS.HTTP:
			case PROTOCOLS.HTTPS:
				// Universal links
				handled();

				if (urlObj.hostname === MM_UNIVERSAL_LINK_HOST) {
					// action is the first part of the pathname
					const action = urlObj.pathname.split('/')[1];

					if (action === ACTIONS.WC && params?.uri) {
						WalletConnect.newSession(params.uri, params.redirectUrl, false);
					} else if (PREFIXES[action]) {
						this.handleBrowserUrl(
							urlObj.href.replace(`https://${MM_UNIVERSAL_LINK_HOST}/${action}/`, PREFIXES[action]),
							browserCallBack
						);
					} else {
						Alert.alert(strings('deeplink.not_supported'));
					}
				} else {
					// Normal links (same as dapp)
					urlObj.set('protocol', 'https:');
					this.handleBrowserUrl(urlObj.href, browserCallBack);
				}
				break;

			// walletconnect related deeplinks
			// address, transactions, etc
			case PROTOCOLS.WC:
				handled(); //TODO: check if we have to handle it here or handle after the next isValidUri check
				if (!WalletConnect.isValidUri(url)) return;

				// eslint-disable-next-line no-case-declarations
				const redirect = params && params.redirect;
				// eslint-disable-next-line no-case-declarations
				const autosign = params && params.autosign;
				WalletConnect.newSession(wcCleanUrl, redirect, autosign);
				break;
			case PROTOCOLS.ETHEREUM:
				handled();
				this.handleEthereumUrl(url, origin);
				break;

			// Specific to the browser screen
			// For ex. navigate to a specific dapp
			case PROTOCOLS.DAPP:
				// Enforce https
				handled();
				urlObj.set('protocol', 'https:');
				this.handleBrowserUrl(urlObj.href, browserCallBack);
				break;

			// Specific to the MetaMask app
			// For ex. go to settings
			case PROTOCOLS.METAMASK:
				handled(); //TODO: check if we need to wait to handle it after all checks are made

				if (urlObj.origin.indexOf('metamask://wc') === 0) {
					const { href } = new URL(urlObj.query.replace('?uri=', ''));

					if (!WalletConnect.isValidUri(href)) return;

					const redirect = params && params.redirect;
					const autosign = params && params.autosign;
					WalletConnect.newSession(href, redirect, autosign);
				}
				break;
			default:
				return false;
		}

		return true;
	}
}

let instance = null;

const SharedDeeplinkManager = {
	init: (navigation) => {
		instance = new DeeplinkManager(navigation);
	},
	parse: (url, args) => instance.parse(url, args),
	setDeeplink: (url) => instance.setDeeplink(url),
	getPendingDeeplink: () => instance.getPendingDeeplink(),
	expireDeeplink: () => instance.expireDeeplink(),
};

export default SharedDeeplinkManager;
