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

class DeeplinkManager {
	constructor(_navigation) {
		this.navigation = _navigation;
		this.pendingDeeplink = null;
	}

	setDeeplink = url => (this.pendingDeeplink = url);

	getPendingDeeplink = () => this.pendingDeeplink;

	expireDeeplink = () => (this.pendingDeeplink = null);

	async handleEthereumUrl(url, origin) {
		let ethUrl = '';
		try {
			ethUrl = parse(url);
		} catch (e) {
			Alert.alert(strings('deeplink.invalid'), e.toString());
			return;
		}

		const functionName = ethUrl.function_name;
		if (!functionName || functionName === 'transfer') {
			const txMeta = { ...ethUrl, source: url };
			if (ethUrl.parameters?.value || ethUrl.parameters?.uint256) {
				this.navigation.navigate('SendView', {
					txMeta: { ...txMeta, action: !functionName ? 'send-eth' : 'send-token' }
				});
			} else {
				this.navigation.navigate('SendFlowView', { txMeta });
			}
		} else if (functionName === 'approve') {
			// add approve transaction
			const {
				parameters: { address, uint256 },
				target_address,
				chain_id
			} = ethUrl;
			const { TransactionController, PreferencesController, NetworkController } = Engine.context;
			if (chain_id) {
				const newNetworkType = getNetworkTypeById(chain_id);
				NetworkController.setProviderType(newNetworkType);
			}
			const txParams = {};
			txParams.to = `${target_address}`;
			txParams.from = `${PreferencesController.state.selectedAddress}`;
			txParams.value = '0x0';
			const value = Number(uint256).toString(16);
			txParams.data = generateApproveData({ spender: address, value });
			TransactionController.addTransaction(txParams, origin);
		}
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

	parse(url, { browserCallBack, origin, onHandled }) {
		const urlObj = new URL(url);
		let params;

		if (urlObj.query.length) {
			try {
				params = qs.parse(urlObj.query.substring(1));
			} catch (e) {
				Alert.alert(strings('deeplink.invalid'), e.toString());
			}
		}

		const handled = () => onHandled?.();

		const { MM_UNIVERSAL_LINK_HOST } = AppConstants;

		switch (urlObj.protocol.replace(':', '')) {
			case 'http':
			case 'https':
				// Universal links
				handled();
				if (urlObj.hostname === MM_UNIVERSAL_LINK_HOST) {
					// action is the first parth of the pathname
					const action = urlObj.pathname.split('/')[1];

					switch (action) {
						case 'wc':
							params && params.uri && WalletConnect.newSession(params.uri, params.redirectUrl, false);
							break;
						case 'dapp':
							this.handleBrowserUrl(
								urlObj.href.replace(`https://${MM_UNIVERSAL_LINK_HOST}/dapp/`, 'https://'),
								browserCallBack
							);
							break;
						case 'send':
							this.handleEthereumUrl(
								urlObj.href.replace(`https://${MM_UNIVERSAL_LINK_HOST}/send/`, 'ethereum:'),
								origin
							);
							break;
						case 'approve':
							this.handleEthereumUrl(
								urlObj.href.replace(`https://${MM_UNIVERSAL_LINK_HOST}/approve/`, 'ethereum:'),
								origin
							);
							break;
						case 'payment':
						case 'focus':
						case '':
							break;

						default:
							Alert.alert(strings('deeplink.not_supported'));
					}
				} else {
					// Normal links (same as dapp)

					handled();
					urlObj.set('protocol', 'https:');
					this.handleBrowserUrl(urlObj.href, browserCallBack);
				}
				break;

			// walletconnect related deeplinks
			// address, transactions, etc
			case 'wc':
				handled();
				if (!WalletConnect.isValidUri(url)) return;
				// eslint-disable-next-line no-case-declarations
				const redirect = params && params.redirect;
				// eslint-disable-next-line no-case-declarations
				const autosign = params && params.autosign;
				WalletConnect.newSession(url, redirect, autosign);
				break;
			case 'ethereum':
				handled();
				this.handleEthereumUrl(url, origin);
				break;

			// Specific to the browser screen
			// For ex. navigate to a specific dapp
			case 'dapp':
				// Enforce https
				handled();
				urlObj.set('protocol', 'https:');
				this.handleBrowserUrl(urlObj.href, browserCallBack);
				break;

			// Specific to the MetaMask app
			// For ex. go to settings
			case 'metamask':
				handled();
				break;
			default:
				return false;
		}

		return true;
	}
}

let instance = null;

const SharedDeeplinkManager = {
	init: navigation => {
		instance = new DeeplinkManager(navigation);
	},
	parse: (url, args) => instance.parse(url, args),
	setDeeplink: url => instance.setDeeplink(url),
	getPendingDeeplink: () => instance.getPendingDeeplink(),
	expireDeeplink: () => instance.expireDeeplink()
};

export default SharedDeeplinkManager;
