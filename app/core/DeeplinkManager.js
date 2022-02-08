'use strict';

import URL from 'url-parse';
import qs from 'qs';
import { Alert } from 'react-native';
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

	_approveTransaction = (ethUrl, origin) => {
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

		const uint256Number = Number(uint256);

		if (Number.isNaN(uint256Number)) throw new Error('The parameter uint256 should be a number');
		if (!Number.isInteger(uint256Number)) throw new Error('The parameter uint256 should be an integer');

		const value = uint256Number.toString(16);

		const txParams = {
			to: target_address.toString(),
			from: PreferencesController.state.selectedAddress.toString(),
			value: '0x0',
			data: generateApproveData({ spender: address, value }),
		};

		TransactionController.addTransaction(txParams, origin, WalletDevice.MM_MOBILE);
	};

	async _handleEthereumUrl(url, origin) {
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
				this._approveTransaction(ethUrl, origin);
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

	_handleBrowserUrl(url, callback) {
		this.navigation.navigate(
			'BrowserTabHome',
			callback ? null : { screen: 'BrowserView', params: { newTabUrl: url, timestamp: Date.now() } }
		);

		if (callback) callback(url);
	}

	parse(url, { browserCallBack, origin, onHandled }) {
		const urlObj = new URL(
			url
				.replace(`${PROTOCOLS.DAPP}/${PROTOCOLS.HTTPS}://`, `${PROTOCOLS.DAPP}/`)
				.replace(`${PROTOCOLS.DAPP}/${PROTOCOLS.HTTP}://`, `${PROTOCOLS.DAPP}/`)
		);
		let params;
		let wcCleanUrl;

		if (urlObj.query.length) {
			try {
				params = qs.parse(urlObj.query.substring(1));
			} catch (e) {
				if (e) Alert.alert(strings('deeplink.invalid'), e.toString());
			}
		}

		const handled = () => (onHandled ? onHandled() : false);

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
						WalletConnect.newSession(params.uri, params.redirectUrl, false, origin);
					} else if (PREFIXES[action]) {
						this._handleBrowserUrl(
							urlObj.href.replace(`https://${MM_UNIVERSAL_LINK_HOST}/${action}/`, PREFIXES[action]),
							browserCallBack
						);
					}
				} else {
					// Normal links (same as dapp)
					urlObj.set('protocol', 'https:');
					this._handleBrowserUrl(urlObj.href, browserCallBack);
				}
				break;

			// walletconnect related deeplinks
			// address, transactions, etc
			case PROTOCOLS.WC:
				handled();

				wcCleanUrl = url.replace('wc://wc?uri=', '');
				if (!WalletConnect.isValidUri(wcCleanUrl)) {
					Alert.alert(strings('deeplink.invalid'));
					return;
				}

				WalletConnect.newSession(wcCleanUrl, params?.redirect, params?.autosign, origin);
				break;

			case PROTOCOLS.ETHEREUM:
				handled();
				this._handleEthereumUrl(url, origin);
				break;

			// Specific to the browser screen
			// For ex. navigate to a specific dapp
			case PROTOCOLS.DAPP:
				// Enforce https
				handled();
				urlObj.set('protocol', 'https:');
				this._handleBrowserUrl(urlObj.href, browserCallBack);
				break;

			// Specific to the MetaMask app
			// For ex. go to settings
			case PROTOCOLS.METAMASK:
				handled();
				if (url.startsWith('metamask://wc')) {
					const cleanUrlObj = new URL(urlObj.query.replace('?uri=', ''));
					const href = cleanUrlObj.href;

					if (!WalletConnect.isValidUri(href)) {
						Alert.alert(strings('deeplink.not_supported'));
						return;
					}

					WalletConnect.newSession(href, params?.redirect, params?.autosign, origin);
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
